/**
 * MigrationRunner
 * Manages and executes database migrations
 */

import { DatabaseAdapter } from '../adapters/Adapter';
import { Migration } from './Migration';
import { MigrationRecord, MigrationStatus } from './types';

export class MigrationRunner {
  private adapter: DatabaseAdapter;
  private migrationsTable: string = 'migrations';

  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
  }

  /**
   * Ensure migrations table exists
   */
  async ensureMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.adapter.escapeIdentifier(this.migrationsTable)} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        batch INTEGER NOT NULL,
        migration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await this.adapter.execute(sql);
  }

  /**
   * Run pending migrations
   */
  async up(
    migrations: Map<string, new (adapter: DatabaseAdapter) => Migration>
  ): Promise<string[]> {
    await this.ensureMigrationsTable();

    const executed = await this.getExecutedMigrations();
    const executedNames = new Set(executed.map(m => m.name));
    const batch = await this.getNextBatch();
    const ran: string[] = [];

    for (const [name, MigrationClass] of migrations) {
      if (!executedNames.has(name)) {
        console.log(`Running migration: ${name}`);

        const migration = new MigrationClass(this.adapter);

        try {
          await migration.up();
          await this.recordMigration(name, batch);
          ran.push(name);
          console.log(`✓ Migrated: ${name}`);
        } catch (error) {
          console.error(`✗ Failed migration: ${name}`);
          throw error;
        }
      }
    }

    if (ran.length === 0) {
      console.log('No pending migrations');
    }

    return ran;
  }

  /**
   * Rollback the last batch of migrations
   */
  async rollback(
    migrations: Map<string, new (adapter: DatabaseAdapter) => Migration>,
    steps: number = 1
  ): Promise<string[]> {
    await this.ensureMigrationsTable();

    const executed = await this.getExecutedMigrations();
    if (executed.length === 0) {
      console.log('No migrations to rollback');
      return [];
    }

    // Get the migrations to rollback
    const batches = [...new Set(executed.map(m => m.batch))].sort((a, b) => b - a);
    const batchesToRollback = batches.slice(0, steps);
    const toRollback = executed.filter(m => batchesToRollback.includes(m.batch)).reverse(); // Rollback in reverse order

    const rolledBack: string[] = [];

    for (const record of toRollback) {
      const MigrationClass = migrations.get(record.name);
      if (!MigrationClass) {
        console.warn(`Migration class not found: ${record.name}`);
        continue;
      }

      console.log(`Rolling back: ${record.name}`);

      const migration = new MigrationClass(this.adapter);

      try {
        await migration.down();
        await this.removeMigration(record.name);
        rolledBack.push(record.name);
        console.log(`✓ Rolled back: ${record.name}`);
      } catch (error) {
        console.error(`✗ Failed rollback: ${record.name}`);
        throw error;
      }
    }

    return rolledBack;
  }

  /**
   * Reset all migrations (rollback all)
   */
  async reset(
    migrations: Map<string, new (adapter: DatabaseAdapter) => Migration>
  ): Promise<string[]> {
    await this.ensureMigrationsTable();

    const executed = await this.getExecutedMigrations();
    if (executed.length === 0) {
      console.log('No migrations to reset');
      return [];
    }

    return this.rollback(migrations, Infinity);
  }

  /**
   * Get migration status
   */
  async status(
    migrations: Map<string, new (adapter: DatabaseAdapter) => Migration>
  ): Promise<MigrationStatus[]> {
    await this.ensureMigrationsTable();

    const executed = await this.getExecutedMigrations();
    const executedMap = new Map(executed.map(m => [m.name, m]));

    const statuses: MigrationStatus[] = [];

    for (const name of migrations.keys()) {
      const record = executedMap.get(name);
      statuses.push({
        name,
        batch: record?.batch,
        migrated: !!record,
        migration_time: record?.migration_time,
      });
    }

    return statuses;
  }

  /**
   * Get executed migrations from database
   */
  private async getExecutedMigrations(): Promise<MigrationRecord[]> {
    const sql = `SELECT * FROM ${this.adapter.escapeIdentifier(this.migrationsTable)} ORDER BY batch ASC, id ASC`;
    const result = await this.adapter.query<MigrationRecord>(sql);
    return result.rows;
  }

  /**
   * Get the next batch number
   */
  private async getNextBatch(): Promise<number> {
    const sql = `SELECT MAX(batch) as max_batch FROM ${this.adapter.escapeIdentifier(this.migrationsTable)}`;
    const result = await this.adapter.query<{ max_batch: number | null }>(sql);
    const maxBatch = result.rows[0]?.max_batch || 0;
    return maxBatch + 1;
  }

  /**
   * Record a migration as executed
   */
  private async recordMigration(name: string, batch: number): Promise<void> {
    const sql = `INSERT INTO ${this.adapter.escapeIdentifier(this.migrationsTable)} (name, batch) VALUES ($1, $2)`;
    await this.adapter.execute(sql, [name, batch]);
  }

  /**
   * Remove a migration record
   */
  private async removeMigration(name: string): Promise<void> {
    const sql = `DELETE FROM ${this.adapter.escapeIdentifier(this.migrationsTable)} WHERE name = $1`;
    await this.adapter.execute(sql, [name]);
  }
}
