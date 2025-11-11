/**
 * Base Association class
 * Provides common functionality for all association types
 */

import { Model } from '../core/Model';
import { AssociationType, AssociationOptions, AssociationMeta } from './types';

export abstract class Association {
  protected owner: typeof Model;
  protected name: string;
  protected target: typeof Model | (() => typeof Model);
  protected options: AssociationOptions;
  protected type: AssociationType;

  constructor(
    owner: typeof Model,
    name: string,
    target: typeof Model | (() => typeof Model),
    options: AssociationOptions = {}
  ) {
    this.owner = owner;
    this.name = name;
    this.target = target;
    this.options = options;
    this.type = this.getAssociationType();
  }

  /**
   * Get the association type
   */
  protected abstract getAssociationType(): AssociationType;

  /**
   * Resolve the target model (handles lazy loading)
   */
  protected getTargetModel(): typeof Model {
    if (typeof this.target === 'function' && this.target.prototype instanceof Model) {
      return this.target as typeof Model;
    }
    // Handle lazy loading function
    return (this.target as () => typeof Model)();
  }

  /**
   * Get foreign key name
   */
  protected getForeignKey(): string {
    if (this.options.foreignKey) {
      return this.options.foreignKey;
    }
    // Default: owner_id for belongsTo, target_id for others
    return this.getDefaultForeignKey();
  }

  /**
   * Get default foreign key name (override in subclasses)
   */
  protected abstract getDefaultForeignKey(): string;

  /**
   * Get primary key name
   */
  protected getPrimaryKey(): string {
    if (this.options.primaryKey) {
      return this.options.primaryKey;
    }
    return this.getTargetModel().getPrimaryKey();
  }

  /**
   * Get association metadata
   */
  getMeta(): AssociationMeta {
    return {
      type: this.type,
      target: this.getTargetModel(),
      foreignKey: this.getForeignKey(),
      primaryKey: this.getPrimaryKey(),
      options: this.options,
    };
  }

  /**
   * Get association name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get association type
   */
  getType(): AssociationType {
    return this.type;
  }
}
