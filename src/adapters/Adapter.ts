/**
 * Base Database Adapter Interface
 * All database adapters must implement this interface
 */

import {
  ConnectionConfig,
  QueryResult,
  ExecuteResult,
  Transaction,
  TableInfo,
  ColumnInfo,
  PreparedStatement,
} from './types';

export abstract class DatabaseAdapter {
  protected connected: boolean = false;
  protected _config: ConnectionConfig;

  constructor(config: ConnectionConfig) {
    this._config = config;
  }

  /**
   * Get the adapter configuration
   */
  get config(): ConnectionConfig {
    return this._config;
  }

  /**
   * Establish connection to the database
   */
  abstract connect(): Promise<void>;

  /**
   * Close database connection and cleanup resources
   */
  abstract disconnect(): Promise<void>;

  /**
   * Execute a SELECT query and return results
   */
  abstract query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;

  /**
   * Execute an INSERT, UPDATE, or DELETE query
   */
  abstract execute(sql: string, params?: any[]): Promise<ExecuteResult>;

  /**
   * Begin a new transaction
   */
  abstract beginTransaction(): Promise<Transaction>;

  /**
   * Get information about a table including columns and indexes
   */
  abstract getTableInfo(tableName: string): Promise<TableInfo>;

  /**
   * Get column information for a specific table
   */
  abstract getColumns(tableName: string): Promise<ColumnInfo[]>;

  /**
   * Check if a table exists in the database
   */
  abstract tableExists(tableName: string): Promise<boolean>;

  /**
   * Escape an identifier (table name, column name, etc.)
   * Different databases use different quote characters
   */
  abstract escapeIdentifier(identifier: string): string;

  /**
   * Format a value for use in a query
   * This is used for generating SQL, but parameterized queries are preferred
   */
  abstract formatValue(value: any): string;

  /**
   * Convert a parameterized query with ? placeholders to database-specific format
   * e.g., PostgreSQL uses $1, $2, MySQL uses ?, SQLite uses ?
   */
  abstract convertPlaceholders(sql: string, params: any[]): PreparedStatement;

  /**
   * Get the current database name
   */
  getDatabaseName(): string {
    return this._config.database;
  }

  /**
   * Check if the adapter is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Ping the database to check if connection is alive
   */
  abstract ping(): Promise<boolean>;

  /**
   * Execute raw SQL (for migrations, custom queries, etc.)
   * This bypasses any query building and executes SQL directly
   */
  async raw<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    return this.query<T>(sql, params);
  }

  /**
   * Get database version information
   */
  abstract getVersion(): Promise<string>;

  /**
   * Get list of all tables in the database
   */
  abstract getTables(): Promise<string[]>;

  /**
   * Truncate a table (delete all rows)
   */
  abstract truncate(tableName: string): Promise<void>;

  /**
   * Drop a table if it exists
   */
  abstract dropTable(tableName: string): Promise<void>;
}
