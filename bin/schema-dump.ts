/**
 * Schema dumper for CLI
 * Extracts current database schema and generates SQL
 */

import type { DatabaseAdapter } from '../src/adapters/Adapter';
import { createAdapter, loadDatabaseConfig } from './migration-runner';

/**
 * Get raw CREATE TABLE statement for PostgreSQL
 */
async function getPostgresTableSQL(adapter: DatabaseAdapter, tableName: string): Promise<string> {
  // Get table columns with full definition
  const columnsQuery = `
    SELECT 
      column_name,
      data_type,
      character_maximum_length,
      column_default,
      is_nullable,
      udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    ORDER BY ordinal_position
  `;

  const columnsResult = await adapter.query<any>(columnsQuery, [tableName]);

  // Get primary key
  const pkQuery = `
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = $1::regclass AND i.indisprimary
  `;

  const pkResult = await adapter.query<any>(pkQuery, [tableName]);
  const primaryKeys = pkResult.rows.map((r: any) => r.attname);

  // Get indexes
  const indexQuery = `
    SELECT
      i.relname as index_name,
      a.attname as column_name,
      ix.indisunique as is_unique
    FROM pg_class t
    JOIN pg_index ix ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    WHERE t.relname = $1
      AND t.relkind = 'r'
      AND NOT ix.indisprimary
    ORDER BY i.relname, a.attnum
  `;

  const indexResult = await adapter.query<any>(indexQuery, [tableName]);

  // Get foreign keys
  const fkQuery = `
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = $1
  `;

  const fkResult = await adapter.query<any>(fkQuery, [tableName]);

  // Build CREATE TABLE statement
  let sql = `CREATE TABLE ${tableName} (\n`;

  const columnDefs = columnsResult.rows.map((col: any) => {
    let def = `  ${col.column_name} ${col.udt_name.toUpperCase()}`;

    if (col.character_maximum_length) {
      def += `(${col.character_maximum_length})`;
    }

    if (col.is_nullable === 'NO') {
      def += ' NOT NULL';
    }

    if (col.column_default) {
      def += ` DEFAULT ${col.column_default}`;
    }

    return def;
  });

  sql += columnDefs.join(',\n');

  // Add primary key constraint
  if (primaryKeys.length > 0) {
    sql += `,\n  PRIMARY KEY (${primaryKeys.join(', ')})`;
  }

  // Add foreign key constraints
  for (const fk of fkResult.rows) {
    sql += `,\n  CONSTRAINT ${fk.constraint_name} FOREIGN KEY (${fk.column_name}) `;
    sql += `REFERENCES ${fk.foreign_table_name}(${fk.foreign_column_name})`;
    if (fk.delete_rule !== 'NO ACTION') {
      sql += ` ON DELETE ${fk.delete_rule}`;
    }
  }

  sql += '\n);';

  // Add index statements
  const indexes = new Map<string, any>();
  for (const idx of indexResult.rows) {
    if (!indexes.has(idx.index_name)) {
      indexes.set(idx.index_name, {
        name: idx.index_name,
        columns: [],
        unique: idx.is_unique,
      });
    }
    indexes.get(idx.index_name).columns.push(idx.column_name);
  }

  for (const [, idx] of indexes) {
    const uniqueStr = idx.unique ? 'UNIQUE ' : '';
    sql += `\nCREATE ${uniqueStr}INDEX ${idx.name} ON ${tableName} (${idx.columns.join(', ')});`;
  }

  return sql;
}

/**
 * Get raw CREATE TABLE statement for SQLite
 */
async function getSqliteTableSQL(adapter: DatabaseAdapter, tableName: string): Promise<string> {
  // SQLite stores the original CREATE TABLE statement
  const query = `
    SELECT sql 
    FROM sqlite_master 
    WHERE type='table' AND name = $1
  `;

  const result = await adapter.query<{ sql: string }>(query, [tableName]);

  if (result.rows.length === 0) {
    throw new Error(`Table ${tableName} not found`);
  }

  let sql = result.rows[0]!.sql;

  // Get indexes
  const indexQuery = `
    SELECT sql
    FROM sqlite_master
    WHERE type='index' 
      AND tbl_name = $1
      AND sql IS NOT NULL
  `;

  const indexResult = await adapter.query<{ sql: string }>(indexQuery, [tableName]);

  for (const row of indexResult.rows) {
    if (row.sql) {
      sql += '\n' + row.sql + ';';
    }
  }

  return sql;
}

/**
 * Dump entire database schema as SQL
 */
export async function dumpSchema(): Promise<string> {
  console.log('Loading database configuration...');
  const config = loadDatabaseConfig();
  const adapter = await createAdapter(config);

  try {
    console.log(`Connecting to ${config.adapter} database...`);
    await adapter.connect();

    console.log('Retrieving database schema...\n');
    const tables = await adapter.getTables();

    // Filter out the migrations table
    const schemaTables = tables.filter(t => t !== 'migrations');

    if (schemaTables.length === 0) {
      throw new Error('No tables found in database (excluding migrations table)');
    }

    console.log(`Found ${schemaTables.length} table(s): ${schemaTables.join(', ')}\n`);

    const sqlStatements: string[] = [];

    for (const tableName of schemaTables) {
      console.log(`Dumping schema for table: ${tableName}`);

      let tableSQL: string;
      if (config.adapter === 'sqlite') {
        tableSQL = await getSqliteTableSQL(adapter, tableName);
      } else {
        tableSQL = await getPostgresTableSQL(adapter, tableName);
      }

      sqlStatements.push(`-- Table: ${tableName}`);
      sqlStatements.push(tableSQL);
      sqlStatements.push('');
    }

    await adapter.disconnect();

    return sqlStatements.join('\n');
  } catch (error) {
    await adapter.disconnect();
    throw error;
  }
}

/**
 * Initialize migration from existing schema
 */
export async function initMigration(): Promise<void> {
  const { existsSync, writeFileSync, mkdirSync } = await import('fs');
  const { join } = await import('path');

  try {
    console.log('Dumping current database schema...\n');
    const schemaSQL = await dumpSchema();

    console.log('\n✓ Schema dump complete\n');
    console.log('Creating initial migration...');

    // Create the migration file
    const migrationName = 'initial_schema';
    const now = new Date();
    const timestamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');

    const filename = `${timestamp}_${migrationName}.ts`;
    const migrationsDir = join(process.cwd(), 'migrations');
    const filepath = join(migrationsDir, filename);

    // Create migrations directory if needed
    if (!existsSync(migrationsDir)) {
      mkdirSync(migrationsDir, { recursive: true });
    }

    // Generate the migration content with the dumped SQL
    const template = `/**
 * Migration: InitialSchema
 * Created: ${now.toISOString()}
 * 
 * This migration was auto-generated from the existing database schema.
 * It contains the SQL statements to recreate the current database structure.
 */

import { Migration } from 'js-record';

export default class InitialSchema extends Migration {
  async up(): Promise<void> {
    // Execute the schema SQL
    const sql = \`
${schemaSQL
  .split('\n')
  .map(line => (line ? '      ' + line : ''))
  .join('\n')}
    \`;
    
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      await this.raw(statement);
    }
  }

  async down(): Promise<void> {
    // WARNING: This will drop all tables!
    // List all tables that were created in up()
    ${
      schemaSQL
        .match(/CREATE TABLE (\w+)/g)
        ?.map(match => {
          const tableName = match.replace('CREATE TABLE ', '');
          return `await this.dropTable('${tableName}');`;
        })
        .join('\n    ') || '// No tables to drop'
    }
  }
}
`;

    writeFileSync(filepath, template, 'utf-8');

    console.log(`\n✓ Created migration: ${filename}`);
    console.log(`  Location: ${filepath}`);
    console.log('\nThis migration contains the current database schema.');
    console.log('You can now track future changes with additional migrations.');
    console.log('\nNote: The migrations table was excluded from the dump.');
  } catch (error) {
    console.error('\n✗ Failed to initialize migration:', error);
    process.exit(1);
  }
}
