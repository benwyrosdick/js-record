/**
 * Migration runner for CLI
 * Loads and runs migrations from the migrations directory
 */

import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { DatabaseAdapter } from '../src/adapters/Adapter';

interface DatabaseConfig {
  adapter: 'postgres' | 'sqlite';
  // Postgres options
  host?: string;
  port?: number;
  database: string;
  user?: string;
  password?: string;
  connectionString?: string;
  ssl?: boolean;
  // SQLite options
  filename?: string;
}

/**
 * Load database configuration from environment or config file
 */
export function loadDatabaseConfig(): DatabaseConfig {
  // First check for config/database.ts (preferred location)
  const configPaths = [
    join(process.cwd(), 'config/database.ts'),
    join(process.cwd(), 'config/database.js'),
    join(process.cwd(), 'js-record.config.js'),
    join(process.cwd(), 'js-record.config.ts'),
    join(process.cwd(), 'database.config.js'),
    join(process.cwd(), 'database.config.ts'),
  ];

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const configModule = require(configPath);
        const config = configModule.default || configModule;

        // Handle new format: { config: ConnectionConfig, adapter: DatabaseAdapter }
        if (config.config && typeof config.config === 'object') {
          return config.config;
        }

        // Handle legacy format: { adapter: PostgresAdapter | SqliteAdapter }
        if (config.adapter && typeof config.adapter === 'function') {
          console.warn(
            'Legacy adapter format detected. Please update config to export both config and adapter.'
          );
          // For now, we need to instantiate adapter to get its config
          try {
            // Create a temporary instance to extract config
            const tempAdapter = new config.adapter({});
            const adapterConfig = tempAdapter.config || {};
            return {
              adapter: adapterConfig.adapter || 'postgres',
              ...adapterConfig,
            };
          } catch (error) {
            console.warn(`Failed to extract config from adapter: ${error}`);
            // Fall back to environment variables
            break;
          }
        }

        // Handle old format: direct config object
        return config;
      } catch (error) {
        console.warn(`Failed to load config from ${configPath}:`, error);
      }
    }
  }

  // Fall back to environment variables
  const adapter = (process.env.DB_ADAPTER || 'postgres') as 'postgres' | 'sqlite';

  if (adapter === 'sqlite') {
    return {
      adapter: 'sqlite',
      database: process.env.DB_FILENAME || process.env.DATABASE_URL || './database.db',
      filename: process.env.DB_FILENAME || process.env.DATABASE_URL || './database.db',
    };
  }

  return {
    adapter: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'postgres',
    user: process.env.DB_USER || process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };
}

/**
 * Create database adapter from configuration
 */
export async function createAdapter(config: DatabaseConfig): Promise<DatabaseAdapter> {
  const { PostgresAdapter, SqliteAdapter } = await import('../src/adapters');

  switch (config.adapter) {
    case 'postgres':
      return new PostgresAdapter(config);
    case 'sqlite':
      return new SqliteAdapter(config);
    default:
      throw new Error(`Unsupported adapter: ${config.adapter}`);
  }
}

/**
 * Load migration files from the migrations directory
 */
export function loadMigrations(): Map<string, any> {
  const migrationsDir = join(process.cwd(), 'migrations');

  if (!existsSync(migrationsDir)) {
    console.log('No migrations directory found. Creating one...');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('fs').mkdirSync(migrationsDir, { recursive: true });
    return new Map();
  }

  const files = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
    .sort();

  const migrations = new Map<string, any>();

  for (const file of files) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const migrationModule = require(join(migrationsDir, file));
      const migrationClass = migrationModule.default || migrationModule;

      // Extract timestamp from filename (YYYYMMDDHHMMSS_description.ext)
      const timestamp = file.split('_')[0];
      migrations.set(timestamp, migrationClass);
    } catch (error) {
      console.warn(`Failed to load migration ${file}:`, error);
    }
  }

  return migrations;
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  console.log('Loading database configuration...');
  const config = loadDatabaseConfig();
  const adapter = await createAdapter(config);

  try {
    console.log(`Connecting to ${config.adapter} database...`);
    await adapter.connect();

    console.log('Loading migrations...');
    const migrations = loadMigrations();
    console.log(`Found ${migrations.size} migration(s)`);

    if (migrations.size === 0) {
      console.log('No migrations to run.');
      return;
    }

    // Create migrations table if it doesn't exist
    await adapter.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        batch INTEGER NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get executed migrations
    const result = await adapter.query('SELECT name FROM migrations ORDER BY executed_at');
    const executedMigrations = new Set(result.rows.map((row: any) => row.name));

    // Filter pending migrations
    const pendingMigrations = Array.from(migrations.entries())
      .filter(([timestamp]) => !executedMigrations.has(timestamp))
      .sort(([a], [b]) => a.localeCompare(b));

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    console.log(`Running ${pendingMigrations.length} pending migration(s)...`);

    // Get current batch number
    const batchResult = await adapter.query(
      'SELECT COALESCE(MAX(batch), 0) as max_batch FROM migrations'
    );
    const currentBatch = (batchResult.rows[0]?.max_batch || 0) + 1;

    // Run migrations
    for (const [timestamp, MigrationClass] of pendingMigrations) {
      console.log(`Running migration: ${timestamp}`);

      try {
        const migration = new MigrationClass();
        await migration.up();

        // Record migration
        await adapter.execute('INSERT INTO migrations (name, batch) VALUES (?, ?)', [
          timestamp,
          currentBatch,
        ]);

        console.log(`✓ Migrated: ${timestamp}`);
      } catch (error) {
        console.error(`✗ Migration failed: ${timestamp}`);
        console.error(error);
        throw error;
      }
    }

    console.log(`✓ Successfully ran ${pendingMigrations.length} migration(s)`);
  } finally {
    await adapter.disconnect();
  }
}

/**
 * Rollback migrations
 */
export async function rollbackMigrations(steps: number = 1): Promise<void> {
  console.log('Loading database configuration...');
  const config = loadDatabaseConfig();
  const adapter = await createAdapter(config);

  try {
    console.log(`Connecting to ${config.adapter} database...`);
    await adapter.connect();

    console.log('Loading migrations...');
    const migrations = loadMigrations();

    // Get migrations to rollback (last N batches)
    const result = await adapter.query(`
      SELECT DISTINCT batch 
      FROM migrations 
      ORDER BY batch DESC 
      LIMIT ${steps}
    `);

    if (result.rows.length === 0) {
      console.log('No migrations to rollback.');
      return;
    }

    const batchesToRollback = result.rows.map((row: any) => row.batch);

    // Get migrations in those batches
    const migrationsToRollback = await adapter.query(
      `
      SELECT name 
      FROM migrations 
      WHERE batch IN (${batchesToRollback.map(() => '?').join(',')})
      ORDER BY executed_at DESC
    `,
      batchesToRollback
    );

    if (migrationsToRollback.rows.length === 0) {
      console.log('No migrations to rollback.');
      return;
    }

    console.log(`Rolling back ${migrationsToRollback.rows.length} migration(s)...`);

    // Rollback migrations in reverse order
    for (const row of migrationsToRollback.rows) {
      const timestamp = row.name;
      const MigrationClass = migrations.get(timestamp);

      if (!MigrationClass) {
        console.warn(`Migration class not found: ${timestamp}`);
        continue;
      }

      console.log(`Rolling back migration: ${timestamp}`);

      try {
        const migration = new MigrationClass();
        await migration.down();

        // Remove migration record
        await adapter.execute('DELETE FROM migrations WHERE name = ?', [timestamp]);

        console.log(`✓ Rolled back: ${timestamp}`);
      } catch (error) {
        console.error(`✗ Rollback failed: ${timestamp}`);
        console.error(error);
        throw error;
      }
    }

    console.log(`✓ Successfully rolled back ${migrationsToRollback.rows.length} migration(s)`);
  } finally {
    await adapter.disconnect();
  }
}

/**
 * Show migration status
 */
export async function migrationStatus(): Promise<void> {
  console.log('Loading database configuration...');
  const config = loadDatabaseConfig();
  const adapter = await createAdapter(config);

  try {
    console.log(`Connecting to ${config.adapter} database...`);
    await adapter.connect();

    console.log('Loading migrations...');
    const migrations = loadMigrations();

    // Create migrations table if it doesn't exist
    await adapter.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        batch INTEGER NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get executed migrations
    const result = await adapter.query('SELECT name, batch FROM migrations ORDER BY executed_at');
    const executedMigrations = new Map(result.rows.map((row: any) => [row.name, row.batch]));

    console.log('\nMigration Status:\n');
    console.log('Status | Batch | Name');
    console.log('-------|-------|-----');

    for (const [timestamp] of Array.from(migrations.entries()).sort()) {
      const status = executedMigrations.has(timestamp) ? '✓' : '○';
      const batch = executedMigrations.get(timestamp) || '-';
      console.log(`  ${status}    |  ${batch.toString().padStart(3)} | ${timestamp}`);
    }

    const completed = executedMigrations.size;
    const pending = migrations.size - completed;

    console.log(`\n${completed} completed, ${pending} pending`);
  } finally {
    await adapter.disconnect();
  }
}

/**
 * Reset all migrations
 */
export async function resetMigrations(): Promise<void> {
  console.log('Loading database configuration...');
  const config = loadDatabaseConfig();
  const adapter = await createAdapter(config);

  try {
    console.log(`Connecting to ${config.adapter} database...`);
    await adapter.connect();

    console.log('Loading migrations...');
    const migrations = loadMigrations();

    // Get all executed migrations
    const result = await adapter.query('SELECT name FROM migrations ORDER BY executed_at DESC');

    if (result.rows.length === 0) {
      console.log('No migrations to reset.');
      return;
    }

    console.log(`Resetting ${result.rows.length} migration(s)...`);

    // Rollback all migrations in reverse order
    for (const row of result.rows) {
      const timestamp = row.name;
      const MigrationClass = migrations.get(timestamp);

      if (!MigrationClass) {
        console.warn(`Migration class not found: ${timestamp}`);
        continue;
      }

      console.log(`Rolling back migration: ${timestamp}`);

      try {
        const migration = new MigrationClass();
        await migration.down();

        // Remove migration record
        await adapter.execute('DELETE FROM migrations WHERE name = ?', [timestamp]);

        console.log(`✓ Rolled back: ${timestamp}`);
      } catch (error) {
        console.error(`✗ Rollback failed: ${timestamp}`);
        console.error(error);
        throw error;
      }
    }

    console.log(`✓ Successfully reset ${result.rows.length} migration(s)`);
  } finally {
    await adapter.disconnect();
  }
}
