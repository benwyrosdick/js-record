/**
 * Migration base class
 * All migrations should extend this class
 */

import { DatabaseAdapter } from '../adapters/Adapter';
import { SchemaBuilder } from './SchemaBuilder';

export abstract class Migration {
  protected adapter: DatabaseAdapter;

  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
  }

  /**
   * Run the migration (up)
   */
  abstract up(): Promise<void>;

  /**
   * Reverse the migration (down)
   */
  abstract down(): Promise<void>;

  /**
   * Create a new table
   */
  protected async createTable(
    tableName: string,
    callback: (table: SchemaBuilder) => void
  ): Promise<void> {
    const builder = new SchemaBuilder(this.adapter, tableName);
    callback(builder);

    const sql = await builder.toSQL();
    await this.adapter.execute(sql);

    // Create indexes
    const tableDef = builder.getTableDefinition();
    for (const index of tableDef.indexes) {
      await this.createIndex(tableName, index.columns, index.unique, index.name);
    }
  }

  /**
   * Drop a table
   */
  protected async dropTable(tableName: string): Promise<void> {
    const sql = `DROP TABLE IF EXISTS ${this.adapter.escapeIdentifier(tableName)} CASCADE`;
    await this.adapter.execute(sql);
  }

  /**
   * Drop a table (throws if doesn't exist)
   */
  protected async dropTableIfExists(tableName: string): Promise<void> {
    await this.dropTable(tableName);
  }

  /**
   * Rename a table
   */
  protected async renameTable(oldName: string, newName: string): Promise<void> {
    const sql = `ALTER TABLE ${this.adapter.escapeIdentifier(oldName)} RENAME TO ${this.adapter.escapeIdentifier(newName)}`;
    await this.adapter.execute(sql);
  }

  /**
   * Add a column to an existing table
   */
  protected async addColumn(
    tableName: string,
    columnName: string,
    type: string,
    options: {
      nullable?: boolean;
      defaultValue?: any;
      unique?: boolean;
    } = {}
  ): Promise<void> {
    let sql = `ALTER TABLE ${this.adapter.escapeIdentifier(tableName)} ADD COLUMN ${this.adapter.escapeIdentifier(columnName)} ${type}`;

    if (options.nullable === false) {
      sql += ' NOT NULL';
    }

    if (options.defaultValue !== undefined) {
      sql += ` DEFAULT ${this.formatValue(options.defaultValue)}`;
    }

    if (options.unique) {
      sql += ' UNIQUE';
    }

    await this.adapter.execute(sql);
  }

  /**
   * Drop a column from a table
   */
  protected async dropColumn(tableName: string, columnName: string): Promise<void> {
    const sql = `ALTER TABLE ${this.adapter.escapeIdentifier(tableName)} DROP COLUMN ${this.adapter.escapeIdentifier(columnName)}`;
    await this.adapter.execute(sql);
  }

  /**
   * Rename a column
   */
  protected async renameColumn(tableName: string, oldName: string, newName: string): Promise<void> {
    const sql = `ALTER TABLE ${this.adapter.escapeIdentifier(tableName)} RENAME COLUMN ${this.adapter.escapeIdentifier(oldName)} TO ${this.adapter.escapeIdentifier(newName)}`;
    await this.adapter.execute(sql);
  }

  /**
   * Create an index
   */
  protected async createIndex(
    tableName: string,
    columns: string[],
    unique: boolean = false,
    indexName?: string
  ): Promise<void> {
    const name = indexName || `${tableName}_${columns.join('_')}_index`;
    const uniqueStr = unique ? 'UNIQUE ' : '';
    const columnList = columns.map(c => this.adapter.escapeIdentifier(c)).join(', ');

    const sql = `CREATE ${uniqueStr}INDEX ${this.adapter.escapeIdentifier(name)} ON ${this.adapter.escapeIdentifier(tableName)} (${columnList})`;
    await this.adapter.execute(sql);
  }

  /**
   * Drop an index
   */
  protected async dropIndex(_tableName: string, indexName: string): Promise<void> {
    const sql = `DROP INDEX IF EXISTS ${this.adapter.escapeIdentifier(indexName)}`;
    await this.adapter.execute(sql);
  }

  /**
   * Execute raw SQL
   */
  protected async raw(sql: string, params: any[] = []): Promise<void> {
    await this.adapter.execute(sql, params);
  }

  /**
   * Format value for SQL
   */
  private formatValue(value: any): string {
    if (value === null) {
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
    return String(value);
  }
}
