/**
 * HasManyThrough Association
 * Represents a many-to-many relationship through a join table
 * Example: User has many Tags through PostTags
 * (users -> post_tags -> tags)
 */

import { Model } from '../core/Model';
import { Association } from './Association';
import { HasManyThroughOptions, AssociationType } from './types';
import { toSnakeCase } from '../core/utils';
import { QueryBuilder } from '../core/QueryBuilder';

export class HasManyThrough extends Association {
  protected options: HasManyThroughOptions;

  constructor(
    owner: typeof Model,
    name: string,
    target: typeof Model | (() => typeof Model),
    options: HasManyThroughOptions
  ) {
    super(owner, name, target, options);
    this.options = options;

    if (!options.through) {
      throw new Error('HasManyThrough requires a "through" option');
    }
  }

  protected getAssociationType(): AssociationType {
    return 'hasManyThrough';
  }

  protected getDefaultForeignKey(): string {
    // Foreign key on the join table that references the owner
    const ownerName = toSnakeCase(this.owner.name);
    return `${ownerName}_id`;
  }

  /**
   * Get the through foreign key (references the target model)
   */
  protected getThroughForeignKey(): string {
    if (this.options.throughForeignKey) {
      return this.options.throughForeignKey;
    }

    const targetModel = this.getTargetModel();
    const targetName = toSnakeCase(targetModel.name);
    return `${targetName}_id`;
  }

  /**
   * Get the join table name
   */
  protected getJoinTable(): string {
    return this.options.through;
  }

  /**
   * Get a query builder for the associated records
   */
  query(ownerInstance: Model): QueryBuilder {
    const targetModel = this.getTargetModel() as any;
    const joinTable = this.getJoinTable();
    const foreignKey = this.getForeignKey();
    const throughForeignKey = this.getThroughForeignKey();
    const primaryKey = this.owner.getPrimaryKey();
    const targetPrimaryKey = targetModel.getPrimaryKey();
    const primaryKeyValue = (ownerInstance as any)[primaryKey];

    const targetTable = targetModel.getTableName();

    // Build a join query
    const query = targetModel
      .query()
      .join(
        joinTable,
        `${targetTable}.${targetPrimaryKey}`,
        '=',
        `${joinTable}.${throughForeignKey}`
      )
      .where(`${joinTable}.${foreignKey}`, '=', primaryKeyValue);

    return query;
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
   * Add existing records to the association (create join table entries)
   */
  async add(ownerInstance: Model, ...targetInstances: Model[]): Promise<void> {
    const adapter = this.owner.getAdapter();
    const joinTable = this.getJoinTable();
    const foreignKey = this.getForeignKey();
    const throughForeignKey = this.getThroughForeignKey();
    const primaryKey = this.owner.getPrimaryKey();
    const targetPrimaryKey = this.getTargetModel().getPrimaryKey();
    const primaryKeyValue = (ownerInstance as any)[primaryKey];

    for (const targetInstance of targetInstances) {
      const targetPrimaryKeyValue = (targetInstance as any)[targetPrimaryKey];

      // Insert into join table
      const sql = `
        INSERT INTO ${adapter.escapeIdentifier(joinTable)} 
        (${adapter.escapeIdentifier(foreignKey)}, ${adapter.escapeIdentifier(throughForeignKey)})
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `;

      await adapter.execute(sql, [primaryKeyValue, targetPrimaryKeyValue]);
    }
  }

  /**
   * Remove records from the association (delete join table entries)
   */
  async remove(ownerInstance: Model, ...targetInstances: Model[]): Promise<void> {
    const adapter = this.owner.getAdapter();
    const joinTable = this.getJoinTable();
    const foreignKey = this.getForeignKey();
    const throughForeignKey = this.getThroughForeignKey();
    const primaryKey = this.owner.getPrimaryKey();
    const targetPrimaryKey = this.getTargetModel().getPrimaryKey();
    const primaryKeyValue = (ownerInstance as any)[primaryKey];

    for (const targetInstance of targetInstances) {
      const targetPrimaryKeyValue = (targetInstance as any)[targetPrimaryKey];

      // Delete from join table
      const sql = `
        DELETE FROM ${adapter.escapeIdentifier(joinTable)} 
        WHERE ${adapter.escapeIdentifier(foreignKey)} = $1 
        AND ${adapter.escapeIdentifier(throughForeignKey)} = $2
      `;

      await adapter.execute(sql, [primaryKeyValue, targetPrimaryKeyValue]);
    }
  }

  /**
   * Clear all associations (delete all join table entries for this owner)
   */
  async clear(ownerInstance: Model): Promise<number> {
    const adapter = this.owner.getAdapter();
    const joinTable = this.getJoinTable();
    const foreignKey = this.getForeignKey();
    const primaryKey = this.owner.getPrimaryKey();
    const primaryKeyValue = (ownerInstance as any)[primaryKey];

    const sql = `
      DELETE FROM ${adapter.escapeIdentifier(joinTable)} 
      WHERE ${adapter.escapeIdentifier(foreignKey)} = $1
    `;

    const result = await adapter.execute(sql, [primaryKeyValue]);
    return result.rowCount;
  }

  /**
   * Create a new target record and add it to the association
   */
  async create(ownerInstance: Model, attributes: Record<string, any>): Promise<Model> {
    const targetModel = this.getTargetModel() as any;
    const targetInstance = await targetModel.create(attributes);
    await this.add(ownerInstance, targetInstance);
    return targetInstance;
  }
}
