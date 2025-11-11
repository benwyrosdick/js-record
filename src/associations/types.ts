/**
 * Association types and interfaces
 */

import { Model } from '../core/Model';

export type AssociationType = 'belongsTo' | 'hasOne' | 'hasMany' | 'hasManyThrough';

export interface AssociationOptions {
  foreignKey?: string;
  primaryKey?: string;
  as?: string;
  dependent?: 'destroy' | 'delete' | 'nullify';
  through?: string;
  source?: string;
}

export interface BelongsToOptions extends AssociationOptions {
  foreignKey?: string;
  primaryKey?: string;
}

export interface HasOneOptions extends AssociationOptions {
  foreignKey?: string;
  primaryKey?: string;
  dependent?: 'destroy' | 'delete' | 'nullify';
}

export interface HasManyOptions extends AssociationOptions {
  foreignKey?: string;
  primaryKey?: string;
  dependent?: 'destroy' | 'delete' | 'nullify';
}

export interface HasManyThroughOptions extends AssociationOptions {
  through: string;
  foreignKey?: string;
  throughForeignKey?: string;
  primaryKey?: string;
  source?: string;
}

export interface AssociationDefinition {
  name: string;
  type: AssociationType;
  target: typeof Model | (() => typeof Model);
  options: AssociationOptions;
}

export interface AssociationMeta {
  type: AssociationType;
  target: typeof Model;
  foreignKey: string;
  primaryKey: string;
  options: AssociationOptions;
}
