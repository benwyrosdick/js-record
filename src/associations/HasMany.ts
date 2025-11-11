/**
 * HasMany Association
 * Represents a one-to-many relationship where the foreign key is on the target model
 * Example: User has many Posts (posts.user_id references users.id)
 */

import { Model } from '../core/Model';
import { Association } from './Association';
import { HasManyOptions, AssociationType } from './types';
import { toSnakeCase } from '../core/utils';
import { QueryBuilder } from '../core/QueryBuilder';

export class HasMany extends Association {
  protected options: HasManyOptions;

  constructor(
    owner: typeof Model,
    name: string,
    target: typeof Model | (() => typeof Model),
    options: HasManyOptions = {}
  ) {
    super(owner, name, target, options);
    this.options = options;
  }

  protected getAssociationType(): AssociationType {
    return 'hasMany';
  }

  protected getDefaultForeignKey(): string {
    // Default: owner_name_id (e.g., user_id for User)
    const ownerName = toSnakeCase(this.owner.name);
    return `${ownerName}_id`;
  }

  /**
   * Get a query builder for the associated records
   */
  query(ownerInstance: Model): QueryBuilder {
    const targetModel = this.getTargetModel() as any;
    const foreignKey = this.getForeignKey();
    const primaryKey = this.owner.getPrimaryKey();
    const primaryKeyValue = (ownerInstance as any)[primaryKey];

    return targetModel.where({ [foreignKey]: primaryKeyValue });
  }

  /**
   * Get all associated records
   */
  async all(ownerInstance: Model): Promise<Model[]> {
    return this.query(ownerInstance).all();
  }

  /**
   * Get first associated record
   */
  async first(ownerInstance: Model): Promise<Model | null> {
    return this.query(ownerInstance).first();
  }

  /**
   * Get last associated record
   */
  async last(ownerInstance: Model): Promise<Model | null> {
    return this.query(ownerInstance).last();
  }

  /**
   * Count associated records
   */
  async count(ownerInstance: Model): Promise<number> {
    return this.query(ownerInstance).count();
  }

  /**
   * Check if any associated records exist
   */
  async exists(ownerInstance: Model): Promise<boolean> {
    return this.query(ownerInstance).exists();
  }

  /**
   * Find an associated record by conditions
   */
  async find(ownerInstance: Model, conditions: Record<string, any>): Promise<Model | null> {
    return this.query(ownerInstance).where(conditions).first();
  }

  /**
   * Create a new associated record
   */
  async create(ownerInstance: Model, attributes: Record<string, any>): Promise<Model> {
    const targetModel = this.getTargetModel() as any;
    const foreignKey = this.getForeignKey();
    const primaryKey = this.owner.getPrimaryKey();
    const primaryKeyValue = (ownerInstance as any)[primaryKey];

    // Set the foreign key on the new record
    const targetAttributes = {
      ...attributes,
      [foreignKey]: primaryKeyValue,
    };

    return targetModel.create(targetAttributes);
  }

  /**
   * Build a new associated record without saving
   */
  build(ownerInstance: Model, attributes: Record<string, any>): Model {
    const targetModel = this.getTargetModel() as any;
    const foreignKey = this.getForeignKey();
    const primaryKey = this.owner.getPrimaryKey();
    const primaryKeyValue = (ownerInstance as any)[primaryKey];

    const targetAttributes = {
      ...attributes,
      [foreignKey]: primaryKeyValue,
    };

    return new targetModel(targetAttributes);
  }

  /**
   * Add existing records to the association
   */
  async add(ownerInstance: Model, ...targetInstances: Model[]): Promise<void> {
    const foreignKey = this.getForeignKey();
    const primaryKey = this.owner.getPrimaryKey();
    const primaryKeyValue = (ownerInstance as any)[primaryKey];

    for (const targetInstance of targetInstances) {
      (targetInstance as any)[foreignKey] = primaryKeyValue;
      await targetInstance.save();
    }
  }

  /**
   * Remove records from the association (set foreign key to null)
   */
  async remove(_ownerInstance: Model, ...targetInstances: Model[]): Promise<void> {
    const foreignKey = this.getForeignKey();

    for (const targetInstance of targetInstances) {
      (targetInstance as any)[foreignKey] = null;
      await targetInstance.save();
    }
  }

  /**
   * Delete all associated records
   */
  async destroyAll(ownerInstance: Model): Promise<number> {
    const records = await this.all(ownerInstance);
    let count = 0;

    for (const record of records) {
      const destroyed = await record.destroy();
      if (destroyed) {
        count++;
      }
    }

    return count;
  }

  /**
   * Delete associated records matching conditions
   */
  async destroyBy(ownerInstance: Model, conditions: Record<string, any>): Promise<number> {
    const query = this.query(ownerInstance);
    const records = await query.where(conditions).all();
    let count = 0;

    for (const record of records) {
      const destroyed = await record.destroy();
      if (destroyed) {
        count++;
      }
    }

    return count;
  }

  /**
   * Clear all associations (set foreign keys to null)
   */
  async clear(ownerInstance: Model): Promise<number> {
    const records = await this.all(ownerInstance);
    const foreignKey = this.getForeignKey();
    let count = 0;

    for (const record of records) {
      (record as any)[foreignKey] = null;
      await record.save();
      count++;
    }

    return count;
  }
}
