/**
 * Database adapter type definitions
 * Provides a generic interface for different database systems
 */

// Connection configuration types
export interface ConnectionConfig {
  host?: string;
  port?: number;
  database: string;
  user?: string;
  password?: string;
  connectionString?: string;
  ssl?: boolean | { [key: string]: any };
  poolSize?: number;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
}

// Query result types
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  fields?: FieldInfo[];
}

export interface ExecuteResult {
  rowCount: number;
  insertId?: number | string;
}

export interface FieldInfo {
  name: string;
  dataType: string;
  nullable: boolean;
}

// Transaction interface
export interface Transaction {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  execute(sql: string, params?: any[]): Promise<ExecuteResult>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isActive(): boolean;
}

// Schema introspection types
export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  primaryKey?: string[];
  indexes: IndexInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  maxLength?: number;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  primary: boolean;
}

// Column type mapping for different databases
export enum ColumnType {
  INTEGER = 'integer',
  BIGINT = 'bigint',
  SMALLINT = 'smallint',
  DECIMAL = 'decimal',
  NUMERIC = 'numeric',
  REAL = 'real',
  DOUBLE = 'double',
  FLOAT = 'float',
  VARCHAR = 'varchar',
  CHAR = 'char',
  TEXT = 'text',
  BOOLEAN = 'boolean',
  DATE = 'date',
  TIME = 'time',
  TIMESTAMP = 'timestamp',
  TIMESTAMPTZ = 'timestamptz',
  JSON = 'json',
  JSONB = 'jsonb',
  UUID = 'uuid',
  ARRAY = 'array',
  BYTEA = 'bytea',
}

// Parameterized query support
export interface PreparedStatement {
  sql: string;
  params: any[];
}
