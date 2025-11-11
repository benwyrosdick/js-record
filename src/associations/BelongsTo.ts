/**
 * BelongsTo Association
 * Represents a one-to-one relationship where the foreign key is on this model
 * Example: Post belongs to User (posts.user_id references users.id)
 */

import { Model } from '../core/Model';
import { Association } from './Association';
import { BelongsToOptions, AssociationType } from './types';
import { toSnakeCase } from '../core/utils';

export class BelongsTo extends Association {
  protected options: BelongsToOptions;

  constructor(
    owner: typeof Model,
    name: string,
    target: typeof Model | (() => typeof Model),
    options: BelongsToOptions = {}
  ) {
    super(owner, name, target, options);
    this.options = options;
  }

  protected getAssociationType(): AssociationType {
    return 'belongsTo';
  }

  protected getDefaultForeignKey(): string {
    // Default: target_name_id (e.g., user_id for User)
    const targetModel = this.getTargetModel();
    const targetName = toSnakeCase(targetModel.name);
    return `${targetName}_id`;
  }

  /**
   * Get the associated record for a given owner instance
   */
  async get(ownerInstance: Model): Promise<Model | null> {
    const targetModel = this.getTargetModel() as any;
    const foreignKey = this.getForeignKey();
    const primaryKey = this.getPrimaryKey();

    const foreignKeyValue = (ownerInstance as any)[foreignKey];

    if (!foreignKeyValue) {
      return null;
    }

    return targetModel.findBy({ [primaryKey]: foreignKeyValue });
  }

  /**
   * Set the associated record for a given owner instance
   */
  async set(ownerInstance: Model, targetInstance: Model | null): Promise<void> {
    const foreignKey = this.getForeignKey();
    const primaryKey = this.getPrimaryKey();

    if (targetInstance === null) {
      (ownerInstance as any)[foreignKey] = null;
    } else {
      const primaryKeyValue = (targetInstance as any)[primaryKey];
      (ownerInstance as any)[foreignKey] = primaryKeyValue;
    }
  }

  /**
   * Create a new associated record and set it
   */
  async create(ownerInstance: Model, attributes: Record<string, any>): Promise<Model> {
    const targetModel = this.getTargetModel() as any;
    const targetInstance = await targetModel.create(attributes);
    await this.set(ownerInstance, targetInstance);
    return targetInstance;
  }

  /**
   * Build a new associated record without saving
   */
  build(ownerInstance: Model, attributes: Record<string, any>): Model {
    const targetModel = this.getTargetModel() as any;
    const targetInstance = new targetModel(attributes);

    const foreignKey = this.getForeignKey();
    const primaryKey = this.getPrimaryKey();
    const primaryKeyValue = (targetInstance as any)[primaryKey];

    if (primaryKeyValue) {
      (ownerInstance as any)[foreignKey] = primaryKeyValue;
    }

    return targetInstance;
  }
}
