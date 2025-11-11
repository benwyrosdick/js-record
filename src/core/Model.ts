/**
 * Base Model class
 * Provides ActiveRecord pattern for database models
 */

import { DatabaseAdapter } from '../adapters/Adapter';
import { QueryBuilder } from './QueryBuilder';
import { classToTableName } from './utils';
import { BelongsTo } from '../associations/BelongsTo';
import { HasOne } from '../associations/HasOne';
import { HasMany } from '../associations/HasMany';
import { HasManyThrough } from '../associations/HasManyThrough';
import type {
  BelongsToOptions,
  HasOneOptions,
  HasManyOptions,
  HasManyThroughOptions,
  AssociationDefinition,
} from '../associations/types';

export interface ModelConfig {
  tableName?: string;
  primaryKey?: string;
  timestamps?: boolean;
}

export abstract class Model {
  // Configuration - override in subclasses
  static config: ModelConfig = {
    primaryKey: 'id',
    timestamps: true,
  };

  // Database adapter - must be set before using models
  private static _adapter: DatabaseAdapter;

  // Association registry
  private static _associations: Map<string, AssociationDefinition> = new Map();

  // Track if this is a new record or existing
  private _isNewRecord: boolean = true;
  private _originalAttributes: Record<string, any> = {};

  // Loaded associations cache
  private _loadedAssociations: Map<string, any> = new Map();

  /**
   * Set the database adapter for all models
   */
  static setAdapter(adapter: DatabaseAdapter): void {
    this._adapter = adapter;
  }

  /**
   * Get the database adapter
   */
  static getAdapter(): DatabaseAdapter {
    if (!this._adapter) {
      throw new Error('Database adapter not set. Call Model.setAdapter() first.');
    }
    return this._adapter;
  }

  /**
   * Get the table name for this model
   */
  static getTableName(): string {
    return this.config.tableName || classToTableName(this.name);
  }

  /**
   * Get the primary key column name
   */
  static getPrimaryKey(): string {
    return this.config.primaryKey || 'id';
  }

  /**
   * Check if timestamps are enabled
   */
  static hasTimestamps(): boolean {
    return this.config.timestamps !== false;
  }

  /**
   * Create a new query builder for this model
   */
  static query<T extends Model>(this: new () => T): QueryBuilder<T> {
    const ModelClass = this as any;
    return new QueryBuilder<T>(ModelClass.getAdapter(), ModelClass.getTableName());
  }

  /**
   * Find a record by primary key
   */
  static async find<T extends Model>(this: new () => T, id: number | string): Promise<T | null> {
    const ModelClass = this as any;
    const primaryKey = ModelClass.getPrimaryKey();
    const result = await ModelClass.query()
      .where({ [primaryKey]: id })
      .first();

    if (!result) {
      return null;
    }

    return ModelClass.instantiate(result);
  }

  /**
   * Find a record by conditions or throw error
   */
  static async findOrFail<T extends Model>(this: new () => T, id: number | string): Promise<T> {
    const ModelClass = this as any;
    const result = await ModelClass.find(id);
    if (!result) {
      throw new Error(`${this.name} with id ${id} not found`);
    }
    return result;
  }

  /**
   * Find first record matching conditions
   */
  static async findBy<T extends Model>(
    this: new () => T,
    conditions: Record<string, any>
  ): Promise<T | null> {
    const ModelClass = this as any;
    const result = await ModelClass.query().where(conditions).first();

    if (!result) {
      return null;
    }

    return ModelClass.instantiate(result);
  }

  /**
   * Get all records
   */
  static async all<T extends Model>(this: new () => T): Promise<T[]> {
    const ModelClass = this as any;
    const results = await ModelClass.query().all();
    return results.map((data: any) => ModelClass.instantiate(data));
  }

  /**
   * Get first record
   */
  static async first<T extends Model>(this: new () => T): Promise<T | null> {
    const ModelClass = this as any;
    const result = await ModelClass.query().first();
    if (!result) {
      return null;
    }
    return ModelClass.instantiate(result);
  }

  /**
   * Get last record
   */
  static async last<T extends Model>(this: new () => T): Promise<T | null> {
    const ModelClass = this as any;
    const result = await ModelClass.query().last();
    if (!result) {
      return null;
    }
    return ModelClass.instantiate(result);
  }

  /**
   * Count records
   */
  static async count<T extends Model>(
    this: new () => T,
    conditions?: Record<string, any>
  ): Promise<number> {
    const ModelClass = this as any;
    const query = ModelClass.query();
    if (conditions) {
      query.where(conditions);
    }
    return query.count();
  }

  /**
   * Check if records exist
   */
  static async exists<T extends Model>(
    this: new () => T,
    conditions?: Record<string, any>
  ): Promise<boolean> {
    const ModelClass = this as any;
    const query = ModelClass.query();
    if (conditions) {
      query.where(conditions);
    }
    return query.exists();
  }

  /**
   * Create a new record
   */
  static async create<T extends Model>(this: new () => T, attributes: Partial<T>): Promise<T> {
    const instance = new this();
    Object.assign(instance, attributes);
    await instance.save();
    return instance;
  }

  /**
   * Update records matching conditions
   */
  static async update<T extends Model>(
    this: new () => T,
    id: number | string,
    attributes: Partial<T>
  ): Promise<T> {
    const ModelClass = this as any;
    const instance = await ModelClass.findOrFail(id);
    Object.assign(instance, attributes);
    await instance.save();
    return instance;
  }

  /**
   * Delete a record by ID
   */
  static async destroy<T extends Model>(this: new () => T, id: number | string): Promise<boolean> {
    const ModelClass = this as any;
    const adapter = ModelClass.getAdapter();
    const tableName = ModelClass.getTableName();
    const primaryKey = ModelClass.getPrimaryKey();

    const sql = `DELETE FROM ${adapter.escapeIdentifier(tableName)} WHERE ${adapter.escapeIdentifier(primaryKey)} = $1`;
    const result = await adapter.execute(sql, [id]);

    return result.rowCount > 0;
  }

  /**
   * WHERE clause helper
   */
  static where<T extends Model>(
    this: new () => T,
    conditions: Record<string, any> | string,
    ...args: any[]
  ): QueryBuilder<T> {
    const ModelClass = this as any;
    return ModelClass.query().where(conditions, ...args);
  }

  /**
   * ORDER BY clause helper
   */
  static orderBy<T extends Model>(
    this: new () => T,
    column: string,
    direction: 'ASC' | 'DESC' = 'ASC'
  ): QueryBuilder<T> {
    const ModelClass = this as any;
    return ModelClass.query().orderBy(column, direction);
  }

  /**
   * LIMIT clause helper
   */
  static limit<T extends Model>(this: new () => T, value: number): QueryBuilder<T> {
    const ModelClass = this as any;
    return ModelClass.query().limit(value);
  }

  /**
   * Define a belongsTo association
   */
  static belongsTo(
    this: typeof Model,
    name: string,
    target: typeof Model | (() => typeof Model),
    options: BelongsToOptions = {}
  ): void {
    const association = new BelongsTo(this, name, target, options);
    this._associations.set(name, {
      name,
      type: 'belongsTo',
      target,
      options,
    });

    // Define getter on prototype
    Object.defineProperty(this.prototype, name, {
      get: function (this: Model) {
        // Check if already loaded
        if (this._loadedAssociations.has(name)) {
          return this._loadedAssociations.get(name);
        }
        // Return a promise that can be awaited
        return association.get(this);
      },
      configurable: true,
      enumerable: false,
    });
  }

  /**
   * Define a hasOne association
   */
  static hasOne(
    this: typeof Model,
    name: string,
    target: typeof Model | (() => typeof Model),
    options: HasOneOptions = {}
  ): void {
    const association = new HasOne(this, name, target, options);
    this._associations.set(name, {
      name,
      type: 'hasOne',
      target,
      options,
    });

    // Define getter on prototype
    Object.defineProperty(this.prototype, name, {
      get: function (this: Model) {
        if (this._loadedAssociations.has(name)) {
          return this._loadedAssociations.get(name);
        }
        return association.get(this);
      },
      configurable: true,
      enumerable: false,
    });
  }

  /**
   * Define a hasMany association
   */
  static hasMany(
    this: typeof Model,
    name: string,
    target: typeof Model | (() => typeof Model),
    options: HasManyOptions = {}
  ): void {
    const association = new HasMany(this, name, target, options);
    this._associations.set(name, {
      name,
      type: 'hasMany',
      target,
      options,
    });

    // Define getter on prototype that returns association helpers
    Object.defineProperty(this.prototype, name, {
      get: function (this: Model) {
        if (this._loadedAssociations.has(name)) {
          return this._loadedAssociations.get(name);
        }
        // Return an object with association methods
        return {
          all: () => association.all(this),
          first: () => association.first(this),
          last: () => association.last(this),
          count: () => association.count(this),
          exists: () => association.exists(this),
          find: (conditions: Record<string, any>) => association.find(this, conditions),
          create: (attributes: Record<string, any>) => association.create(this, attributes),
          build: (attributes: Record<string, any>) => association.build(this, attributes),
          add: (...instances: Model[]) => association.add(this, ...instances),
          remove: (...instances: Model[]) => association.remove(this, ...instances),
          destroyAll: () => association.destroyAll(this),
          clear: () => association.clear(this),
          query: () => association.query(this),
        };
      },
      configurable: true,
      enumerable: false,
    });
  }

  /**
   * Define a hasManyThrough association (many-to-many)
   */
  static hasManyThrough(
    this: typeof Model,
    name: string,
    target: typeof Model | (() => typeof Model),
    options: HasManyThroughOptions
  ): void {
    const association = new HasManyThrough(this, name, target, options);
    this._associations.set(name, {
      name,
      type: 'hasManyThrough',
      target,
      options,
    });

    // Define getter on prototype that returns association helpers
    Object.defineProperty(this.prototype, name, {
      get: function (this: Model) {
        if (this._loadedAssociations.has(name)) {
          return this._loadedAssociations.get(name);
        }
        // Return an object with association methods
        return {
          all: () => association.all(this),
          first: () => association.first(this),
          last: () => association.last(this),
          count: () => association.count(this),
          exists: () => association.exists(this),
          create: (attributes: Record<string, any>) => association.create(this, attributes),
          add: (...instances: Model[]) => association.add(this, ...instances),
          remove: (...instances: Model[]) => association.remove(this, ...instances),
          clear: () => association.clear(this),
          query: () => association.query(this),
        };
      },
      configurable: true,
      enumerable: false,
    });
  }

  /**
   * Get all defined associations
   */
  static getAssociations(): Map<string, AssociationDefinition> {
    return this._associations;
  }

  /**
   * Instantiate a model from database row
   */
  protected static instantiate<T extends Model>(this: new () => T, data: any): T {
    const instance = new this();
    Object.assign(instance, data);
    (instance as any)._isNewRecord = false;
    (instance as any)._originalAttributes = { ...data };
    return instance;
  }

  /**
   * Get the constructor (class) of this instance
   */
  private get modelClass(): typeof Model {
    return this.constructor as typeof Model;
  }

  /**
   * Check if this is a new record
   */
  isNewRecord(): boolean {
    return this._isNewRecord;
  }

  /**
   * Check if record has been persisted
   */
  isPersisted(): boolean {
    return !this._isNewRecord;
  }

  /**
   * Get primary key value
   */
  getId(): any {
    const primaryKey = this.modelClass.getPrimaryKey();
    return (this as any)[primaryKey];
  }

  /**
   * Save the record (insert or update)
   */
  async save(): Promise<boolean> {
    if (this._isNewRecord) {
      return this.performInsert();
    } else {
      return this.performUpdate();
    }
  }

  /**
   * Update specific attributes and save
   */
  async update(attributes: Partial<this>): Promise<boolean> {
    Object.assign(this, attributes);
    return this.save();
  }

  /**
   * Delete this record
   */
  async destroy(): Promise<boolean> {
    if (this._isNewRecord) {
      throw new Error('Cannot destroy a new record');
    }

    const adapter = this.modelClass.getAdapter();
    const tableName = this.modelClass.getTableName();
    const primaryKey = this.modelClass.getPrimaryKey();
    const id = this.getId();

    const sql = `DELETE FROM ${adapter.escapeIdentifier(tableName)} WHERE ${adapter.escapeIdentifier(primaryKey)} = $1`;
    const result = await adapter.execute(sql, [id]);

    return result.rowCount > 0;
  }

  /**
   * Reload the record from database
   */
  async reload(): Promise<this> {
    if (this._isNewRecord) {
      throw new Error('Cannot reload a new record');
    }

    const id = this.getId();
    const ModelClass = this.modelClass as any;
    const result = await ModelClass.find(id);

    if (!result) {
      throw new Error('Record no longer exists');
    }

    Object.assign(this, result);
    this._originalAttributes = { ...result };

    return this;
  }

  /**
   * Get changed attributes
   */
  getChanges(): Record<string, any> {
    const changes: Record<string, any> = {};

    for (const key in this) {
      if (key.startsWith('_') || typeof (this as any)[key] === 'function') {
        continue;
      }

      const currentValue = (this as any)[key];
      const originalValue = this._originalAttributes[key];

      if (currentValue !== originalValue) {
        changes[key] = currentValue;
      }
    }

    return changes;
  }

  /**
   * Check if the record has been changed
   */
  hasChanges(): boolean {
    return Object.keys(this.getChanges()).length > 0;
  }

  /**
   * Convert model to plain object
   */
  toJSON(): Record<string, any> {
    const obj: Record<string, any> = {};

    for (const key in this) {
      if (key.startsWith('_') || typeof (this as any)[key] === 'function') {
        continue;
      }
      obj[key] = (this as any)[key];
    }

    return obj;
  }

  /**
   * Perform INSERT operation
   */
  private async performInsert(): Promise<boolean> {
    const adapter = this.modelClass.getAdapter();
    const tableName = this.modelClass.getTableName();
    const attributes = this.getAttributesForInsert();

    const columns = Object.keys(attributes);
    const values = Object.values(attributes);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    const columnNames = columns.map(col => adapter.escapeIdentifier(col)).join(', ');
    const sql = `INSERT INTO ${adapter.escapeIdentifier(tableName)} (${columnNames}) VALUES (${placeholders.join(', ')}) RETURNING *`;

    const result = await adapter.query(sql, values);

    if (result.rows.length > 0) {
      Object.assign(this, result.rows[0]);
      this._isNewRecord = false;
      this._originalAttributes = { ...result.rows[0] };
      return true;
    }

    return false;
  }

  /**
   * Perform UPDATE operation
   */
  private async performUpdate(): Promise<boolean> {
    const changes = this.getChanges();

    if (Object.keys(changes).length === 0) {
      return true; // Nothing to update
    }

    const adapter = this.modelClass.getAdapter();
    const tableName = this.modelClass.getTableName();
    const primaryKey = this.modelClass.getPrimaryKey();
    const id = this.getId();

    // Add updated_at if timestamps enabled
    if (this.modelClass.hasTimestamps() && !changes.updated_at) {
      changes.updated_at = new Date();
      (this as any).updated_at = changes.updated_at;
    }

    const columns = Object.keys(changes);
    const values = Object.values(changes);
    const setClause = columns
      .map((col, i) => `${adapter.escapeIdentifier(col)} = $${i + 1}`)
      .join(', ');

    values.push(id);
    const sql = `UPDATE ${adapter.escapeIdentifier(tableName)} SET ${setClause} WHERE ${adapter.escapeIdentifier(primaryKey)} = $${values.length} RETURNING *`;

    const result = await adapter.query(sql, values);

    if (result.rows.length > 0) {
      Object.assign(this, result.rows[0]);
      this._originalAttributes = { ...result.rows[0] };
      return true;
    }

    return false;
  }

  /**
   * Get attributes for insert (excluding primary key if auto-increment)
   */
  private getAttributesForInsert(): Record<string, any> {
    const attributes: Record<string, any> = {};
    const primaryKey = this.modelClass.getPrimaryKey();

    for (const key in this) {
      if (key.startsWith('_') || typeof (this as any)[key] === 'function') {
        continue;
      }

      // Skip primary key if it's null/undefined (auto-increment)
      if (key === primaryKey && ((this as any)[key] === null || (this as any)[key] === undefined)) {
        continue;
      }

      attributes[key] = (this as any)[key];
    }

    // Add timestamps if enabled
    if (this.modelClass.hasTimestamps()) {
      const now = new Date();
      if (!attributes.created_at) {
        attributes.created_at = now;
        (this as any).created_at = now;
      }
      if (!attributes.updated_at) {
        attributes.updated_at = now;
        (this as any).updated_at = now;
      }
    }

    return attributes;
  }
}
