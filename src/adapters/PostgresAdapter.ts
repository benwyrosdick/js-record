/**
 * PostgreSQL Database Adapter
 * Implements the DatabaseAdapter interface for PostgreSQL databases
 * Uses Bun's built-in SQL support
 */

import { DatabaseAdapter } from './Adapter';
import {
  ConnectionConfig,
  QueryResult,
  ExecuteResult,
  Transaction,
  TableInfo,
  ColumnInfo,
  IndexInfo,
  FieldInfo,
  PreparedStatement,
} from './types';

// Lazy load bun's sql module to avoid import errors in Node.js
let sql: any = null;
async function getSql() {
  if (!sql) {
    try {
      const bunModule = await import('bun');
      sql = bunModule.sql;
    } catch (error) {
      throw new Error('PostgresAdapter requires Bun runtime. Please run with Bun.');
    }
  }
  return sql;
}

export class PostgresAdapter extends DatabaseAdapter {
  private originalDatabaseUrl: string | undefined;
  private connectionString: string = '';

  constructor(config: ConnectionConfig) {
    super(config);
  }

  /**
   * Build connection string from config
   */
  private buildConnectionString(): string {
    if (this.config.connectionString) {
      return this.config.connectionString;
    }

    const host = this.config.host || 'localhost';
    const port = this.config.port || 5432;
    const database = this.config.database;
    const user = this.config.user || 'postgres';
    const password = this.config.password || '';

    let connStr = `postgres://${user}:${password}@${host}:${port}/${database}`;

    if (this.config.ssl) {
      connStr += '?sslmode=require';
    }

    return connStr;
  }

  /**
   * Connect to PostgreSQL database
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      this.connectionString = this.buildConnectionString();

      // Save original DATABASE_URL if it exists
      this.originalDatabaseUrl = process.env.DATABASE_URL;

      // Set DATABASE_URL for Bun's sql to use
      process.env.DATABASE_URL = this.connectionString;

      // Test the connection
      const sql = await getSql();
      await sql.unsafe('SELECT 1');
      this.connected = true;
    } catch (error) {
      // Restore original DATABASE_URL on error
      if (this.originalDatabaseUrl !== undefined) {
        process.env.DATABASE_URL = this.originalDatabaseUrl;
      } else {
        delete process.env.DATABASE_URL;
      }
      throw new Error(`Failed to connect to PostgreSQL: ${(error as Error).message}`);
    }
  }

  /**
   * Disconnect from PostgreSQL database
   */
  async disconnect(): Promise<void> {
    if (this.connected) {
      try {
        const sql = await getSql();
        await sql.end();
      } catch (error) {
        // Ignore errors on disconnect
      }

      // Restore original DATABASE_URL
      if (this.originalDatabaseUrl !== undefined) {
        process.env.DATABASE_URL = this.originalDatabaseUrl;
      } else {
        delete process.env.DATABASE_URL;
      }

      this.connected = false;
    }
  }

  /**
   * Execute a SELECT query
   */
  async query<T = any>(sqlQuery: string, params: any[] = []): Promise<QueryResult<T>> {
    this.ensureConnected();

    try {
      // Bun's sql.unsafe() supports parameterized queries
      const sql = await getSql();
      const result: any = await sql.unsafe(sqlQuery, params);

      const rows = (Array.isArray(result) ? result : []) as T[];
      const rowCount = result.count || rows.length;

      const fields: FieldInfo[] = [];
      if (rows.length > 0) {
        const firstRow = rows[0] as any;
        for (const key in firstRow) {
          fields.push({
            name: key,
            dataType: typeof firstRow[key],
            nullable: true,
          });
        }
      }

      return {
        rows,
        rowCount,
        fields,
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${(error as Error).message}\nSQL: ${sqlQuery}`);
    }
  }

  /**
   * Execute an INSERT, UPDATE, or DELETE query
   */
  async execute(sqlQuery: string, params: any[] = []): Promise<ExecuteResult> {
    this.ensureConnected();

    try {
      const sql = await getSql();
      const result: any = await sql.unsafe(sqlQuery, params);

      let rowCount = 0;
      let insertId: any = undefined;

      if (result.count !== undefined && result.count !== null) {
        rowCount = result.count;
      } else if (Array.isArray(result)) {
        rowCount = result.length;
      }

      if (Array.isArray(result) && result.length > 0 && result[0]?.id !== undefined) {
        insertId = result[0].id;
      }

      return {
        rowCount,
        insertId,
      };
    } catch (error) {
      throw new Error(`Execute failed: ${(error as Error).message}\nSQL: ${sqlQuery}`);
    }
  }

  /**
   * Begin a new transaction
   * Note: Due to Bun's SQL limitations with manual transactions,
   * this uses a workaround that may not work with connection pooling
   */
  async beginTransaction(): Promise<Transaction> {
    this.ensureConnected();

    // Use sql.transaction() for manual control
    return new PostgresTransaction();
  }

  /**
   * Get table information including columns and indexes
   */
  async getTableInfo(tableName: string): Promise<TableInfo> {
    const [schema, table] = this.parseTableName(tableName);
    const columns = await this.getColumns(tableName);
    const indexes = await this.getIndexes(tableName);
    const primaryKey = columns.filter(col => col.isPrimaryKey).map(col => col.name);

    return {
      name: table,
      schema,
      columns,
      primaryKey: primaryKey.length > 0 ? primaryKey : undefined,
      indexes,
    };
  }

  /**
   * Get column information for a table
   */
  async getColumns(tableName: string): Promise<ColumnInfo[]> {
    const [schema, table] = this.parseTableName(tableName);

    const sqlQuery = `
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        CASE 
          WHEN pk.column_name IS NOT NULL THEN true 
          ELSE false 
        END as is_primary_key,
        CASE 
          WHEN c.column_default LIKE 'nextval%' THEN true 
          ELSE false 
        END as is_auto_increment
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
          AND tc.table_schema = ku.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
      ) pk ON c.column_name = pk.column_name
      WHERE c.table_schema = $1
        AND c.table_name = $2
      ORDER BY c.ordinal_position
    `;

    const result = await this.query<any>(sqlQuery, [schema, table]);

    return result.rows.map(row => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      isPrimaryKey: row.is_primary_key,
      isAutoIncrement: row.is_auto_increment,
      maxLength: row.character_maximum_length,
    }));
  }

  /**
   * Get indexes for a table
   */
  private async getIndexes(tableName: string): Promise<IndexInfo[]> {
    const [schema, table] = this.parseTableName(tableName);

    const sqlQuery = `
      SELECT
        i.relname as index_name,
        array_agg(a.attname ORDER BY x.ord) as column_names,
        ix.indisunique as is_unique,
        ix.indisprimary as is_primary
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS x(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = x.attnum
      WHERE n.nspname = $1
        AND t.relname = $2
      GROUP BY i.relname, ix.indisunique, ix.indisprimary
    `;

    const result = await this.query<any>(sqlQuery, [schema, table]);

    return result.rows.map(row => ({
      name: row.index_name,
      columns: this.parsePostgresArray(row.column_names),
      unique: row.is_unique,
      primary: row.is_primary,
    }));
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const [schema, table] = this.parseTableName(tableName);

    const sqlQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 
          AND table_name = $2
      ) as exists
    `;

    const result = await this.query<{ exists: boolean }>(sqlQuery, [schema, table]);
    return result.rows[0]?.exists || false;
  }

  /**
   * Escape identifier for PostgreSQL (double quotes)
   */
  escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /**
   * Format a value for SQL
   */
  formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    if (Array.isArray(value)) {
      return `ARRAY[${value.map(v => this.formatValue(v)).join(',')}]`;
    }
    if (typeof value === 'object') {
      return `'${JSON.stringify(value)}'::jsonb`;
    }
    return String(value);
  }

  /**
   * Convert ? placeholders to $1, $2, etc. for PostgreSQL
   */
  convertPlaceholders(sqlQuery: string, params: any[]): PreparedStatement {
    let index = 0;
    const convertedSql = sqlQuery.replace(/\?/g, () => `$${++index}`);

    return {
      sql: convertedSql,
      params,
    };
  }

  /**
   * Ping database to check connection
   */
  async ping(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get PostgreSQL version
   */
  async getVersion(): Promise<string> {
    const result = await this.query<{ version: string }>('SELECT version()');
    return result.rows[0]?.version || 'Unknown';
  }

  /**
   * Get all tables in the database
   */
  async getTables(): Promise<string[]> {
    const sqlQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const result = await this.query<{ table_name: string }>(sqlQuery);
    return result.rows.map(row => row.table_name);
  }

  /**
   * Truncate a table
   */
  async truncate(tableName: string): Promise<void> {
    const escaped = this.escapeIdentifier(tableName);
    await this.execute(`TRUNCATE TABLE ${escaped} RESTART IDENTITY CASCADE`);
  }

  /**
   * Drop a table
   */
  async dropTable(tableName: string): Promise<void> {
    const escaped = this.escapeIdentifier(tableName);
    await this.execute(`DROP TABLE IF EXISTS ${escaped} CASCADE`);
  }

  /**
   * Ensure connection is established
   */
  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }

  /**
   * Parse table name into schema and table
   */
  private parseTableName(tableName: string): [string, string] {
    const parts = tableName.split('.');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return [parts[0], parts[1]];
    }
    return ['public', tableName];
  }

  /**
   * Parse PostgreSQL array string format {item1,item2} to JavaScript array
   */
  private parsePostgresArray(value: any): string[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const content = trimmed.slice(1, -1);
        if (content === '') {
          return [];
        }
        return content.split(',').map((item: string) => item.trim());
      }
      return [value];
    }
    return [];
  }
}

/**
 * PostgreSQL Transaction implementation using Bun's SQL
 *
 * Note: Bun's SQL has limitations with manual transactions.
 * This implementation uses sql.transaction() which provides isolation
 * but commits automatically. Manual BEGIN/COMMIT/ROLLBACK is not fully
 * supported due to connection pooling.
 */
class PostgresTransaction implements Transaction {
  private active: boolean = true;
  private queries: Array<{ query: string; params: any[] }> = [];
  private shouldRollback: boolean = false;

  constructor() {
    // Start transaction using sql.transaction
    this.queries.push({ query: 'BEGIN', params: [] });
  }

  async query<T = any>(sqlQuery: string, params: any[] = []): Promise<QueryResult<T>> {
    this.ensureActive();

    try {
      // Store query for execution
      this.queries.push({ query: sqlQuery, params });

      // Execute immediately using sql.transaction for isolation
      const sql = await getSql();
      const result: any = await sql.transaction(async (tx: any) => {
        return await tx.unsafe(sqlQuery, params);
      });

      const rows = (Array.isArray(result) ? result : []) as T[];
      const rowCount = result.count || rows.length;

      const fields: FieldInfo[] = [];
      if (rows.length > 0) {
        const firstRow = rows[0] as any;
        for (const key in firstRow) {
          fields.push({
            name: key,
            dataType: typeof firstRow[key],
            nullable: true,
          });
        }
      }

      return {
        rows,
        rowCount,
        fields,
      };
    } catch (error) {
      this.shouldRollback = true;
      throw new Error(`Transaction query failed: ${(error as Error).message}`);
    }
  }

  async execute(sqlQuery: string, params: any[] = []): Promise<ExecuteResult> {
    this.ensureActive();

    try {
      this.queries.push({ query: sqlQuery, params });

      const sql = await getSql();
      const result: any = await sql.transaction(async (tx: any) => {
        return await tx.unsafe(sqlQuery, params);
      });

      let rowCount = 0;
      let insertId: any = undefined;

      if (result.count !== undefined && result.count !== null) {
        rowCount = result.count;
      } else if (Array.isArray(result)) {
        rowCount = result.length;
      }

      if (Array.isArray(result) && result.length > 0 && result[0]?.id !== undefined) {
        insertId = result[0].id;
      }

      return {
        rowCount,
        insertId,
      };
    } catch (error) {
      this.shouldRollback = true;
      throw new Error(`Transaction execute failed: ${(error as Error).message}`);
    }
  }

  async commit(): Promise<void> {
    this.ensureActive();

    try {
      if (this.shouldRollback) {
        throw new Error('Cannot commit transaction that encountered errors');
      }
      // Transaction auto-commits with sql.transaction()
      this.active = false;
    } catch (error) {
      throw new Error(`Transaction commit failed: ${(error as Error).message}`);
    }
  }

  async rollback(): Promise<void> {
    this.ensureActive();

    try {
      // Mark as rolled back
      this.shouldRollback = true;
      this.active = false;
      // Note: With sql.transaction(), individual operations may have already committed
      // This is a limitation of Bun's current SQL API
    } catch (error) {
      throw new Error(`Transaction rollback failed: ${(error as Error).message}`);
    }
  }

  isActive(): boolean {
    return this.active;
  }

  private ensureActive(): void {
    if (!this.active) {
      throw new Error('Transaction is not active');
    }
  }
}
