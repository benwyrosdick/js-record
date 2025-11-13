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
  database?: string;
  user?: string;
  password?: string;
  // SQLite options
  filename?: string;
}

/**
 * Load database configuration from environment or config file
 */
export function loadDatabaseConfig(): DatabaseConfig {
  // First check for js-record.config.js/ts
  const configPaths = [
    join(process.cwd(), 'js-record.config.js'),
    join(process.cwd(), 'js-record.config.ts'),
    join(process.cwd(), 'database.config.js'),
    join(process.cwd(), 'database.config.ts'),
  ];

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const config = require(configPath);
        return config.default || config;
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
 * Create database adapter from config
 */
export async function createAdapter(config: DatabaseConfig): Promise<DatabaseAdapter> {
  if (config.adapter === 'sqlite') {
    const { SqliteAdapter } = await import('../src/adapters/SqliteAdapter');
    return new SqliteAdapter({
      database: config.filename || './database.db',
    });
  }

  const { PostgresAdapter } = await import('../src/adapters/PostgresAdapter');
  return new PostgresAdapter({
    host: config.host || 'localhost',
    port: config.port || 5432,
    database: config.database || 'postgres',
    user: config.user || 'postgres',
    password: config.password || 'postgres',
  });
}

/**
 * Load all migrations from the migrations directory
 */
export async function loadMigrations(): Promise<Map<string, any>> {
  const migrationsDir = join(process.cwd(), 'migrations');

  if (!existsSync(migrationsDir)) {
    throw new Error(
      `Migrations directory not found: ${migrationsDir}\n` +
        'Run "js-record migration:create" to create your first migration.'
    );
  }

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
    .sort();

  if (files.length === 0) {
    throw new Error(
      'No migration files found in migrations directory.\n' +
        'Run "js-record migration:create" to create your first migration.'
    );
  }

  const migrations = new Map();

  for (const file of files) {
    const name = file.replace(/\.(ts|js)$/, '');
    const fullPath = join(migrationsDir, file);

    try {
      // Dynamic import for both .ts and .js files
      const module = require(fullPath);
      const MigrationClass = module.default || module;

      if (!MigrationClass) {
        console.warn(`Warning: No default export found in ${file}`);
        continue;
      }

      migrations.set(name, MigrationClass);
    } catch (error) {
      console.error(`Error loading migration ${file}:`, error);
      throw error;
    }
  }

  return migrations;
}

/**
 * Run pending migrations
 */
export async function runMigrations(): Promise<void> {
  console.log('Loading database configuration...');
  const config = loadDatabaseConfig();
  const adapter = await createAdapter(config);

  try {
    console.log(`Connecting to ${config.adapter} database...`);
    await adapter.connect();

    console.log('Loading migrations...');
    const migrations = await loadMigrations();
    console.log(`Found ${migrations.size} migration(s)\n`);

    const { MigrationRunner } = await import('../src/migrations/MigrationRunner');
    const runner = new MigrationRunner(adapter);

    console.log('Running pending migrations...');
    const ran = await runner.up(migrations);

    if (ran.length === 0) {
      console.log('\n✓ Database is up to date');
    } else {
      console.log(`\n✓ Successfully ran ${ran.length} migration(s)`);
    }
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
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
    const migrations = await loadMigrations();

    const { MigrationRunner } = await import('../src/migrations/MigrationRunner');
    const runner = new MigrationRunner(adapter);

    console.log(`Rolling back last ${steps} batch(es)...\n`);
    const rolledBack = await runner.rollback(migrations, steps);

    if (rolledBack.length === 0) {
      console.log('\n✓ No migrations to rollback');
    } else {
      console.log(`\n✓ Successfully rolled back ${rolledBack.length} migration(s)`);
    }
  } catch (error) {
    console.error('\n✗ Rollback failed:', error);
    process.exit(1);
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
    const migrations = await loadMigrations();

    const { MigrationRunner } = await import('../src/migrations/MigrationRunner');
    const runner = new MigrationRunner(adapter);
    const statuses = await runner.status(migrations);

    console.log('\nMigration Status:\n');
    console.log('Status | Batch | Name');
    console.log('-------|-------|-----');

    for (const status of statuses) {
      const icon = status.migrated ? '  ✓   ' : '  ○   ';
      const batch = status.batch ? `  ${status.batch}  ` : '  -  ';
      console.log(`${icon} |${batch} | ${status.name}`);
    }

    const pending = statuses.filter((s: any) => !s.migrated).length;
    const completed = statuses.filter((s: any) => s.migrated).length;

    console.log(`\n${completed} completed, ${pending} pending`);
  } catch (error) {
    console.error('\n✗ Failed to get status:', error);
    process.exit(1);
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
    const migrations = await loadMigrations();

    const { MigrationRunner } = await import('../src/migrations/MigrationRunner');
    const runner = new MigrationRunner(adapter);

    console.log('Resetting all migrations...\n');
    const reset = await runner.reset(migrations);

    if (reset.length === 0) {
      console.log('\n✓ No migrations to reset');
    } else {
      console.log(`\n✓ Successfully reset ${reset.length} migration(s)`);
    }
  } catch (error) {
    console.error('\n✗ Reset failed:', error);
    process.exit(1);
  } finally {
    await adapter.disconnect();
  }
}
