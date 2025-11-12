/**
 * SQLite Database Adapter
 * Implements the DatabaseAdapter interface for SQLite databases
 * Uses Bun's built-in SQLite support
 */

import { Database } from 'bun:sqlite';
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

export class SqliteAdapter extends DatabaseAdapter {
  private db: Database | null = null;

  constructor(config: ConnectionConfig) {
    super(config);
  }

  /**
   * Connect to SQLite database
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // For SQLite, the 'database' config is the file path
      // Use ':memory:' for in-memory database
      this.db = new Database(this.config.database, {
        create: true,
        readwrite: true,
      });

      // Enable foreign keys (disabled by default in SQLite)
      this.db.run('PRAGMA foreign_keys = ON');

      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to SQLite: ${(error as Error).message}`);
    }
  }

  /**
   * Disconnect from SQLite database
   */
  async disconnect(): Promise<void> {
    if (this.connected && this.db) {
      try {
        this.db.close();
        this.db = null;
      } catch (error) {
        // Ignore errors on disconnect
      }

      this.connected = false;
    }
  }

  /**
   * Execute a SELECT query
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    this.ensureConnected();

    try {
      const stmt = this.db!.prepare(sql);
      const rows = stmt.all(...params) as T[];

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
        rowCount: rows.length,
        fields,
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${(error as Error).message}\nSQL: ${sql}`);
    }
  }

  /**
   * Execute an INSERT, UPDATE, or DELETE query
   */
  async execute(sql: string, params: any[] = []): Promise<ExecuteResult> {
    this.ensureConnected();

    try {
      const stmt = this.db!.prepare(sql);
      const result = stmt.run(...params);

      return {
        rowCount: result.changes,
        insertId:
          typeof result.lastInsertRowid === 'bigint'
            ? Number(result.lastInsertRowid)
            : result.lastInsertRowid,
      };
    } catch (error) {
      throw new Error(`Execute failed: ${(error as Error).message}\nSQL: ${sql}`);
    }
  }

  /**
   * Begin a new transaction
   */
  async beginTransaction(): Promise<Transaction> {
    this.ensureConnected();
    return new SqliteTransaction(this.db!);
  }

  /**
   * Get table information including columns and indexes
   */
  async getTableInfo(tableName: string): Promise<TableInfo> {
    const columns = await this.getColumns(tableName);
    const indexes = await this.getIndexes(tableName);
    const primaryKey = columns.filter(col => col.isPrimaryKey).map(col => col.name);

    return {
      name: tableName,
      schema: 'main',
      columns,
      primaryKey: primaryKey.length > 0 ? primaryKey : undefined,
      indexes,
    };
  }

  /**
   * Get column information for a table
   */
  async getColumns(tableName: string): Promise<ColumnInfo[]> {
    const result = await this.query<any>(`PRAGMA table_info(${this.escapeIdentifier(tableName)})`);

    return result.rows.map(row => ({
      name: row.name,
      type: row.type.toLowerCase(),
      nullable: row.notnull === 0,
      defaultValue: row.dflt_value,
      isPrimaryKey: row.pk === 1,
      isAutoIncrement: row.pk === 1 && row.type.toLowerCase() === 'integer',
      maxLength: undefined,
    }));
  }

  /**
   * Get indexes for a table
   */
  private async getIndexes(tableName: string): Promise<IndexInfo[]> {
    const indexListResult = await this.query<any>(
      `PRAGMA index_list(${this.escapeIdentifier(tableName)})`
    );

    const indexes: IndexInfo[] = [];

    for (const indexRow of indexListResult.rows) {
      const indexInfoResult = await this.query<any>(`PRAGMA index_info("${indexRow.name}")`);

      const columns = indexInfoResult.rows.map((col: any) => col.name);

      indexes.push({
        name: indexRow.name,
        columns,
        unique: indexRow.unique === 1,
        primary: indexRow.origin === 'pk',
      });
    }

    return indexes;
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName]
    );

    return (result.rows[0]?.count ?? 0) > 0;
  }

  /**
   * Escape identifier for SQLite (double quotes)
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
      return value ? '1' : '0';
    }
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    if (Array.isArray(value) || typeof value === 'object') {
      return `'${JSON.stringify(value)}'`;
    }
    return String(value);
  }

  /**
   * Convert PostgreSQL-style $1, $2 placeholders to SQLite-style ? placeholders
   */
  convertPlaceholders(sql: string, params: any[]): PreparedStatement {
    const convertedSql = sql.replace(/\$\d+/g, () => '?');

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
   * Get SQLite version
   */
  async getVersion(): Promise<string> {
    const result = await this.query<{ version: string }>('SELECT sqlite_version() as version');
    return result.rows[0]?.version || 'Unknown';
  }

  /**
   * Get all tables in the database
   */
  async getTables(): Promise<string[]> {
    const result = await this.query<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    );

    return result.rows.map(row => row.name);
  }

  /**
   * Truncate a table
   */
  async truncate(tableName: string): Promise<void> {
    const escaped = this.escapeIdentifier(tableName);
    await this.execute(`DELETE FROM ${escaped}`);
    // Reset autoincrement counter
    await this.execute(`DELETE FROM sqlite_sequence WHERE name=?`, [tableName]);
  }

  /**
   * Drop a table
   */
  async dropTable(tableName: string): Promise<void> {
    const escaped = this.escapeIdentifier(tableName);
    await this.execute(`DROP TABLE IF EXISTS ${escaped}`);
  }

  /**
   * Ensure connection is established
   */
  private ensureConnected(): void {
    if (!this.connected || !this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }
}

/**
 * SQLite Transaction implementation using Bun's SQLite
 */
class SqliteTransaction implements Transaction {
  private active: boolean = true;
  private db: Database;
  private inTransaction: boolean = false;

  constructor(db: Database) {
    this.db = db;
    // Begin transaction
    this.db.run('BEGIN');
    this.inTransaction = true;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    this.ensureActive();

    try {
      const stmt = this.db.prepare(sql);
      const rows = stmt.all(...params) as T[];

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
        rowCount: rows.length,
        fields,
      };
    } catch (error) {
      throw new Error(`Transaction query failed: ${(error as Error).message}`);
    }
  }

  async execute(sql: string, params: any[] = []): Promise<ExecuteResult> {
    this.ensureActive();

    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...params);

      return {
        rowCount: result.changes,
        insertId:
          typeof result.lastInsertRowid === 'bigint'
            ? Number(result.lastInsertRowid)
            : result.lastInsertRowid,
      };
    } catch (error) {
      throw new Error(`Transaction execute failed: ${(error as Error).message}`);
    }
  }

  async commit(): Promise<void> {
    this.ensureActive();

    try {
      if (this.inTransaction) {
        this.db.run('COMMIT');
        this.inTransaction = false;
      }
      this.active = false;
    } catch (error) {
      throw new Error(`Transaction commit failed: ${(error as Error).message}`);
    }
  }

  async rollback(): Promise<void> {
    this.ensureActive();

    try {
      if (this.inTransaction) {
        this.db.run('ROLLBACK');
        this.inTransaction = false;
      }
      this.active = false;
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
