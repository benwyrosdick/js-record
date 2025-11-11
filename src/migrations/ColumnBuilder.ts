/**
 * ColumnBuilder
 * Fluent interface for defining table columns
 */

import { ColumnDefinition, MigrationColumnType } from './types';

export class ColumnBuilder {
  protected definition: ColumnDefinition;

  constructor(name: string, type: MigrationColumnType) {
    this.definition = {
      name,
      type,
      nullable: false,
    };
  }

  /**
   * Set column length (for string types)
   */
  length(value: number): this {
    this.definition.length = value;
    return this;
  }

  /**
   * Set precision and scale (for decimal types)
   */
  precision(precision: number, scale: number = 0): this {
    this.definition.precision = precision;
    this.definition.scale = scale;
    return this;
  }

  /**
   * Make column nullable
   */
  nullable(): this {
    this.definition.nullable = true;
    return this;
  }

  /**
   * Make column not nullable
   */
  notNullable(): this {
    this.definition.nullable = false;
    return this;
  }

  /**
   * Set default value
   */
  defaultTo(value: any): this {
    this.definition.defaultValue = value;
    return this;
  }

  /**
   * Make column primary key
   */
  primary(): this {
    this.definition.primary = true;
    this.definition.nullable = false;
    return this;
  }

  /**
   * Make column unique
   */
  unique(): this {
    this.definition.unique = true;
    return this;
  }

  /**
   * Add index to column
   */
  index(): this {
    this.definition.index = true;
    return this;
  }

  /**
   * Make column unsigned (for numeric types)
   */
  unsigned(): this {
    this.definition.unsigned = true;
    return this;
  }

  /**
   * Make column auto-increment
   */
  autoIncrement(): this {
    this.definition.autoIncrement = true;
    return this;
  }

  /**
   * Add foreign key reference
   */
  references(column: string): ForeignKeyBuilder {
    return new ForeignKeyBuilder(this.definition, column);
  }

  /**
   * Get the column definition
   */
  getDefinition(): ColumnDefinition {
    return this.definition;
  }
}

/**
 * ForeignKeyBuilder
 * Fluent interface for defining foreign keys
 */
class ForeignKeyBuilder extends ColumnBuilder {
  constructor(definition: ColumnDefinition, column: string) {
    super(definition.name, definition.type);
    this.definition = definition;
    this.definition.references = {
      table: '',
      column,
    };
  }

  /**
   * Specify the referenced table
   */
  on(table: string): this {
    if (this.definition.references) {
      this.definition.references.table = table;
    }
    return this;
  }

  /**
   * Set ON DELETE action
   */
  onDelete(action: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'): this {
    if (this.definition.references) {
      this.definition.references.onDelete = action;
    }
    return this;
  }

  /**
   * Set ON UPDATE action
   */
  onUpdate(action: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'): this {
    if (this.definition.references) {
      this.definition.references.onUpdate = action;
    }
    return this;
  }
}
