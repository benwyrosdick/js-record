/**
 * SchemaBuilder
 * Fluent interface for building table schemas
 */

import { DatabaseAdapter } from '../adapters/Adapter';
import { ColumnBuilder } from './ColumnBuilder';
import { TableDefinition, ColumnDefinition, IndexDefinition } from './types';

export class SchemaBuilder {
  private adapter: DatabaseAdapter;
  private tableName: string;
  private columns: ColumnDefinition[] = [];
  private indexes: IndexDefinition[] = [];
  private primaryKeys: string[] = [];
  private shouldAddTimestamps: boolean = false;

  constructor(adapter: DatabaseAdapter, tableName: string) {
    this.adapter = adapter;
    this.tableName = tableName;
  }

  /**
   * Add an auto-incrementing integer primary key
   */
  increments(name: string = 'id'): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'integer');
    builder.primary().autoIncrement().unsigned();
    this.columns.push(builder.getDefinition());
    this.primaryKeys.push(name);
    return builder;
  }

  /**
   * Add a big integer auto-incrementing primary key
   */
  bigIncrements(name: string = 'id'): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'bigInteger');
    builder.primary().autoIncrement().unsigned();
    this.columns.push(builder.getDefinition());
    this.primaryKeys.push(name);
    return builder;
  }

  /**
   * Add a string column
   */
  string(name: string, length: number = 255): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'string').length(length);
    this.columns.push(builder.getDefinition());
    return builder;
  }

  /**
   * Add a text column
   */
  text(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'text');
    this.columns.push(builder.getDefinition());
    return builder;
  }

  /**
   * Add an integer column
   */
  integer(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'integer');
    this.columns.push(builder.getDefinition());
    return builder;
  }

  /**
   * Add a big integer column
   */
  bigInteger(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'bigInteger');
    this.columns.push(builder.getDefinition());
    return builder;
  }

  /**
   * Add a float column
   */
  float(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'float');
    this.columns.push(builder.getDefinition());
    return builder;
  }

  /**
   * Add a decimal column
   */
  decimal(name: string, precision: number = 8, scale: number = 2): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'decimal').precision(precision, scale);
    this.columns.push(builder.getDefinition());
    return builder;
  }

  /**
   * Add a boolean column
   */
  boolean(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'boolean');
    this.columns.push(builder.getDefinition());
    return builder;
  }

  /**
   * Add a date column
   */
  date(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'date');
    this.columns.push(builder.getDefinition());
    return builder;
  }

  /**
   * Add a datetime column
   */
  datetime(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'datetime');
    this.columns.push(builder.getDefinition());
    return builder;
  }

  /**
   * Add a timestamp column
   */
  timestamp(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'timestamp');
    this.columns.push(builder.getDefinition());
    return builder;
  }

  /**
   * Add a time column
   */
  time(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'time');
    this.columns.push(builder.getDefinition());
    return builder;
  }

  /**
   * Add a JSON column
   */
  json(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'json');
    this.columns.push(builder.getDefinition());
    return builder;
  }

  /**
   * Add a JSONB column (PostgreSQL)
   */
  jsonb(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'jsonb');
    this.columns.push(builder.getDefinition());
    return builder;
  }

  /**
   * Add a UUID column
   */
  uuid(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'uuid');
    this.columns.push(builder.getDefinition());
    return builder;
  }

  /**
   * Add timestamp columns (created_at, updated_at)
   */
  timestamps(): void {
    this.shouldAddTimestamps = true;
    this.timestamp('created_at').defaultTo('CURRENT_TIMESTAMP');
    this.timestamp('updated_at').defaultTo('CURRENT_TIMESTAMP');
  }

  /**
   * Add an index
   */
  index(columns: string | string[], name?: string): void {
    this.indexes.push({
      name,
      columns: Array.isArray(columns) ? columns : [columns],
    });
  }

  /**
   * Add a unique index
   */
  unique(columns: string | string[], name?: string): void {
    this.indexes.push({
      name,
      columns: Array.isArray(columns) ? columns : [columns],
      unique: true,
    });
  }

  /**
   * Get the table definition
   */
  getTableDefinition(): TableDefinition {
    return {
      name: this.tableName,
      columns: this.columns,
      indexes: this.indexes,
      primaryKey: this.primaryKeys.length > 0 ? this.primaryKeys : undefined,
      timestamps: this.shouldAddTimestamps,
    };
  }

  /**
   * Build CREATE TABLE SQL
   */
  async toSQL(): Promise<string> {
    const tableName = this.adapter.escapeIdentifier(this.tableName);
    const columnDefs: string[] = [];

    // Build column definitions
    for (const col of this.columns) {
      columnDefs.push(this.buildColumnSQL(col));
    }

    // Build SQL
    let sql = `CREATE TABLE ${tableName} (\n  `;
    sql += columnDefs.join(',\n  ');
    sql += '\n)';

    return sql;
  }

  /**
   * Build column SQL definition
   */
  private buildColumnSQL(col: ColumnDefinition): string {
    const parts: string[] = [];

    // Column name
    parts.push(this.adapter.escapeIdentifier(col.name));

    // Column type
    parts.push(this.mapColumnType(col));

    // Constraints
    if (col.primary) {
      parts.push('PRIMARY KEY');
    }

    if (col.autoIncrement) {
      // PostgreSQL uses SERIAL/BIGSERIAL for auto-increment
      // Already handled in mapColumnType
    }

    if (!col.nullable && !col.primary) {
      parts.push('NOT NULL');
    }

    if (col.unique) {
      parts.push('UNIQUE');
    }

    if (col.defaultValue !== undefined) {
      if (col.defaultValue === 'CURRENT_TIMESTAMP') {
        parts.push('DEFAULT CURRENT_TIMESTAMP');
      } else if (typeof col.defaultValue === 'string') {
        parts.push(`DEFAULT '${col.defaultValue}'`);
      } else if (typeof col.defaultValue === 'boolean') {
        parts.push(`DEFAULT ${col.defaultValue ? 'TRUE' : 'FALSE'}`);
      } else {
        parts.push(`DEFAULT ${col.defaultValue}`);
      }
    }

    // Foreign key
    if (col.references) {
      const ref = col.references;
      parts.push(
        `REFERENCES ${this.adapter.escapeIdentifier(ref.table)}(${this.adapter.escapeIdentifier(ref.column)})`
      );

      if (ref.onDelete) {
        parts.push(`ON DELETE ${ref.onDelete}`);
      }

      if (ref.onUpdate) {
        parts.push(`ON UPDATE ${ref.onUpdate}`);
      }
    }

    return parts.join(' ');
  }

  /**
   * Map column type to SQL type
   */
  private mapColumnType(col: ColumnDefinition): string {
    switch (col.type) {
      case 'string':
        return `VARCHAR(${col.length || 255})`;
      case 'text':
        return 'TEXT';
      case 'integer':
        if (col.autoIncrement) {
          return 'SERIAL';
        }
        return 'INTEGER';
      case 'bigInteger':
        if (col.autoIncrement) {
          return 'BIGSERIAL';
        }
        return 'BIGINT';
      case 'float':
        return 'REAL';
      case 'decimal':
        return `DECIMAL(${col.precision || 8},${col.scale || 2})`;
      case 'boolean':
        return 'BOOLEAN';
      case 'date':
        return 'DATE';
      case 'datetime':
      case 'timestamp':
        return 'TIMESTAMP';
      case 'time':
        return 'TIME';
      case 'json':
        return 'JSON';
      case 'jsonb':
        return 'JSONB';
      case 'uuid':
        return 'UUID';
      case 'binary':
        return 'BYTEA';
      default:
        return 'TEXT';
    }
  }
}
