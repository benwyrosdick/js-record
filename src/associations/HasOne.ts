/**
 * HasOne Association
 * Represents a one-to-one relationship where the foreign key is on the target model
 * Example: User has one Profile (profiles.user_id references users.id)
 */

import { Model } from '../core/Model';
import { Association } from './Association';
import { HasOneOptions, AssociationType } from './types';
import { toSnakeCase } from '../core/utils';

export class HasOne extends Association {
  protected options: HasOneOptions;

  constructor(
    owner: typeof Model,
    name: string,
    target: typeof Model | (() => typeof Model),
    options: HasOneOptions = {}
  ) {
    super(owner, name, target, options);
    this.options = options;
  }

  protected getAssociationType(): AssociationType {
    return 'hasOne';
  }

  protected getDefaultForeignKey(): string {
    // Default: owner_name_id (e.g., user_id for User)
    const ownerName = toSnakeCase(this.owner.name);
    return `${ownerName}_id`;
  }

  /**
   * Get the associated record for a given owner instance
   */
  async get(ownerInstance: Model): Promise<Model | null> {
    const targetModel = this.getTargetModel() as any;
    const foreignKey = this.getForeignKey();
    const primaryKey = this.owner.getPrimaryKey();
    const primaryKeyValue = (ownerInstance as any)[primaryKey];

    if (!primaryKeyValue) {
      return null;
    }

    return targetModel.findBy({ [foreignKey]: primaryKeyValue });
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
   * Set the associated record (update foreign key)
   */
  async set(ownerInstance: Model, targetInstance: Model | null): Promise<void> {
    const foreignKey = this.getForeignKey();
    const primaryKey = this.owner.getPrimaryKey();
    const primaryKeyValue = (ownerInstance as any)[primaryKey];

    if (targetInstance === null) {
      // Find and nullify existing association
      const existing = await this.get(ownerInstance);
      if (existing) {
        (existing as any)[foreignKey] = null;
        await existing.save();
      }
    } else {
      (targetInstance as any)[foreignKey] = primaryKeyValue;
      await targetInstance.save();
    }
  }

  /**
   * Delete the associated record
   */
  async destroy(ownerInstance: Model): Promise<boolean> {
    const associated = await this.get(ownerInstance);
    if (!associated) {
      return false;
    }
    return associated.destroy();
  }
}
