/**
 * Migration types and interfaces
 */

/**
 * Migration column data types
 */
export type MigrationColumnType =
  | 'string'
  | 'text'
  | 'integer'
  | 'bigInteger'
  | 'float'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'timestamp'
  | 'time'
  | 'json'
  | 'jsonb'
  | 'uuid'
  | 'binary';

/**
 * Column definition
 */
export interface ColumnDefinition {
  name: string;
  type: MigrationColumnType;
  length?: number;
  precision?: number;
  scale?: number;
  nullable?: boolean;
  defaultValue?: any;
  primary?: boolean;
  unique?: boolean;
  index?: boolean;
  unsigned?: boolean;
  autoIncrement?: boolean;
  references?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  };
}

/**
 * Index definition
 */
export interface IndexDefinition {
  name?: string;
  columns: string[];
  unique?: boolean;
  type?: 'btree' | 'hash' | 'gist' | 'gin';
}

/**
 * Table definition
 */
export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  indexes: IndexDefinition[];
  primaryKey?: string[];
  timestamps?: boolean;
}

/**
 * Migration record in database
 */
export interface MigrationRecord {
  id: number;
  name: string;
  batch: number;
  migration_time: Date;
}

/**
 * Migration status
 */
export interface MigrationStatus {
  name: string;
  batch?: number;
  migrated: boolean;
  migration_time?: Date;
}

/**
 * Migration direction
 */
export type MigrationDirection = 'up' | 'down';
