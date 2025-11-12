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
import { Validator } from '../validations/Validator';
import type { ValidationRules, ValidationErrors } from '../validations/types';
import { CallbackRegistry } from '../callbacks/CallbackRegistry';
import type { CallbackType, CallbackFunction, CallbackOptions } from '../callbacks/types';
import {
  ScopeRegistry,
  DefaultScopeRegistry,
  type ScopeFunction,
  type DefaultScopeOptions,
} from './Scope';

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

  // Validation rules - override in subclasses
  static validations: ValidationRules = {};

  // Callback registry (will be overridden by subclasses)
  private static _callbacks: CallbackRegistry;

  // Database adapter - must be set before using models
  private static _adapter: DatabaseAdapter;

  // Association registry
  private static _associations: Map<string, AssociationDefinition> = new Map();

  // Track if this is a new record or existing
  private _isNewRecord: boolean = true;
  private _originalAttributes: Record<string, any> = {};

  // Loaded associations cache
  private _loadedAssociations: Map<string, any> = new Map();

  // Validation errors
  private _errors: ValidationErrors = {};

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
   * Automatically applies default scope if defined
   */
  static query<T extends Model>(this: new () => T): QueryBuilder<T> {
    const ModelClass = this as any;
    const query = new QueryBuilder<T>(ModelClass.getAdapter(), ModelClass.getTableName());

    // Apply default scope if exists and not unscoped
    if (!query.isUnscoped()) {
      const defaultScope = DefaultScopeRegistry.get(this.name);
      if (defaultScope) {
        if (defaultScope.where) {
          query.where(defaultScope.where);
        }
        if (defaultScope.order) {
          if (Array.isArray(defaultScope.order)) {
            query.orderBy(defaultScope.order[0], defaultScope.order[1]);
          } else {
            query.orderBy(defaultScope.order);
          }
        }
        if (defaultScope.scope) {
          defaultScope.scope(query);
        }
      }
    }

    return query;
  }

  /**
   * Define a scope for this model
   */
  static scope<T extends Model>(
    this: new () => T,
    scopeName: string,
    scopeFn: ScopeFunction<T>
  ): void {
    ScopeRegistry.register<T>(this.name, scopeName, scopeFn);

    // Add the scope as a static method on the model class
    const ModelClass = this as any;
    ModelClass[scopeName] = function (...args: any[]) {
      const query = ModelClass.query();
      const scopedQuery = scopeFn(query, ...args);

      // Return an object that wraps the query and allows chaining
      // This allows: Model.published() to work like Model.published().all()
      const wrapper: any = scopedQuery;

      // If called without chaining (as a function result), return the query builder
      return wrapper;
    };
  }

  /**
   * Define a default scope for this model
   */
  static defaultScope(options: DefaultScopeOptions): void {
    DefaultScopeRegistry.register(this.name, options);
  }

  /**
   * Create an unscoped query (bypassing default scope)
   */
  static unscoped<T extends Model>(this: new () => T): QueryBuilder<T> {
    const ModelClass = this as any;
    return new QueryBuilder<T>(ModelClass.getAdapter(), ModelClass.getTableName()).unscoped();
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
   * Get or create callback registry for this class
   */
  private static getCallbackRegistry(): CallbackRegistry {
    if (!Object.prototype.hasOwnProperty.call(this, '_callbacks')) {
      this._callbacks = new CallbackRegistry();
    }
    return this._callbacks;
  }

  /**
   * Register a callback
   */
  static registerCallback(
    type: CallbackType,
    method: string | CallbackFunction,
    options?: CallbackOptions
  ): void {
    this.getCallbackRegistry().register(type, method, options);
  }

  /**
   * Convenience methods for registering callbacks
   */
  static beforeValidation(method: string | CallbackFunction, options?: CallbackOptions): void {
    this.registerCallback('beforeValidation', method, options);
  }

  static afterValidation(method: string | CallbackFunction, options?: CallbackOptions): void {
    this.registerCallback('afterValidation', method, options);
  }

  static beforeSave(method: string | CallbackFunction, options?: CallbackOptions): void {
    this.registerCallback('beforeSave', method, options);
  }

  static afterSave(method: string | CallbackFunction, options?: CallbackOptions): void {
    this.registerCallback('afterSave', method, options);
  }

  static beforeCreate(method: string | CallbackFunction, options?: CallbackOptions): void {
    this.registerCallback('beforeCreate', method, options);
  }

  static afterCreate(method: string | CallbackFunction, options?: CallbackOptions): void {
    this.registerCallback('afterCreate', method, options);
  }

  static beforeUpdate(method: string | CallbackFunction, options?: CallbackOptions): void {
    this.registerCallback('beforeUpdate', method, options);
  }

  static afterUpdate(method: string | CallbackFunction, options?: CallbackOptions): void {
    this.registerCallback('afterUpdate', method, options);
  }

  static beforeDestroy(method: string | CallbackFunction, options?: CallbackOptions): void {
    this.registerCallback('beforeDestroy', method, options);
  }

  static afterDestroy(method: string | CallbackFunction, options?: CallbackOptions): void {
    this.registerCallback('afterDestroy', method, options);
  }

  /**
   * Run callbacks for a specific type
   */
  protected async runCallbacks(type: CallbackType): Promise<boolean> {
    // First, check if there's an instance method with this name
    const instanceMethod = (this as any)[type];
    if (typeof instanceMethod === 'function') {
      const result = await instanceMethod.call(this);
      if (result === false) {
        return false; // Instance method halted the chain
      }
    }

    // Then run registered callbacks
    const ModelClass = this.modelClass as any;
    const registry = ModelClass.getCallbackRegistry();
    const result = await registry.run(type, this);
    return !result.halted;
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
   * Validate the model
   * Returns true if valid, false if invalid
   */
  async validate(): Promise<boolean> {
    // Run beforeValidation callbacks
    const beforeResult = await this.runCallbacks('beforeValidation');
    if (!beforeResult) {
      return false; // Callback halted
    }

    const ModelClass = this.modelClass as any;
    const validationRules = ModelClass.validations || {};

    if (Object.keys(validationRules).length === 0) {
      // Run afterValidation even if no validations
      await this.runCallbacks('afterValidation');
      return true;
    }

    const validator = new Validator(this, validationRules);
    const isValid = await validator.validate();
    this._errors = validator.getErrors();

    // Run afterValidation callbacks
    await this.runCallbacks('afterValidation');

    return isValid;
  }

  /**
   * Check if the model is valid without running validations
   */
  isValid(): boolean {
    return Object.keys(this._errors).length === 0;
  }

  /**
   * Get validation errors
   */
  get errors(): ValidationErrors {
    return this._errors;
  }

  /**
   * Get errors for a specific field
   */
  getFieldErrors(field: string): string[] {
    return this._errors[field] || [];
  }

  /**
   * Clear all validation errors
   */
  clearErrors(): void {
    this._errors = {};
  }

  /**
   * Save the record (insert or update)
   * Runs validations and callbacks before saving
   */
  async save(options: { validate?: boolean } = {}): Promise<boolean> {
    const shouldValidate = options.validate !== false;

    if (shouldValidate) {
      const isValid = await this.validate();
      if (!isValid) {
        return false;
      }
    }

    // Run beforeSave callbacks
    const beforeSaveResult = await this.runCallbacks('beforeSave');
    if (!beforeSaveResult) {
      return false; // Callback halted
    }

    let result: boolean;
    if (this._isNewRecord) {
      result = await this.performInsert();
    } else {
      result = await this.performUpdate();
    }

    if (result) {
      // Run afterSave callbacks
      await this.runCallbacks('afterSave');
    }

    return result;
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

    // Run beforeDestroy callbacks
    const beforeResult = await this.runCallbacks('beforeDestroy');
    if (!beforeResult) {
      return false; // Callback halted
    }

    const adapter = this.modelClass.getAdapter();
    const tableName = this.modelClass.getTableName();
    const primaryKey = this.modelClass.getPrimaryKey();
    const id = this.getId();

    const sql = `DELETE FROM ${adapter.escapeIdentifier(tableName)} WHERE ${adapter.escapeIdentifier(primaryKey)} = $1`;
    const result = await adapter.execute(sql, [id]);

    if (result.rowCount > 0) {
      // Run afterDestroy callbacks
      await this.runCallbacks('afterDestroy');
      return true;
    }

    return false;
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
    // Run beforeCreate callbacks
    const beforeResult = await this.runCallbacks('beforeCreate');
    if (!beforeResult) {
      return false; // Callback halted
    }

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

      // Run afterCreate callbacks
      await this.runCallbacks('afterCreate');

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

    // Run beforeUpdate callbacks
    const beforeResult = await this.runCallbacks('beforeUpdate');
    if (!beforeResult) {
      return false; // Callback halted
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

      // Run afterUpdate callbacks
      await this.runCallbacks('afterUpdate');

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

      // Skip confirmation fields (virtual attributes)
      if (key.endsWith('_confirmation')) {
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
