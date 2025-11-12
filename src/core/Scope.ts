/**
 * Scope System
 * Provides reusable query scopes for models
 */

import { QueryBuilder } from './QueryBuilder';
import type { Model } from './Model';

/**
 * Scope function type - takes a query builder and returns a modified query builder
 */
export type ScopeFunction<T extends Model> = (
  query: QueryBuilder<T>,
  ...args: any[]
) => QueryBuilder<T>;

/**
 * Scope definition with optional parameters
 */
export interface ScopeDefinition<T extends Model> {
  name: string;
  fn: ScopeFunction<T>;
}

/**
 * Registry to store scopes for each model
 */
export class ScopeRegistry {
  private static scopes: Map<string, Map<string, ScopeFunction<any>>> = new Map();

  /**
   * Register a scope for a model
   */
  static register<T extends Model>(
    modelName: string,
    scopeName: string,
    scopeFn: ScopeFunction<T>
  ): void {
    if (!this.scopes.has(modelName)) {
      this.scopes.set(modelName, new Map());
    }

    const modelScopes = this.scopes.get(modelName)!;
    modelScopes.set(scopeName, scopeFn);
  }

  /**
   * Get a scope for a model
   */
  static get<T extends Model>(modelName: string, scopeName: string): ScopeFunction<T> | undefined {
    const modelScopes = this.scopes.get(modelName);
    if (!modelScopes) {
      return undefined;
    }

    return modelScopes.get(scopeName);
  }

  /**
   * Get all scopes for a model
   */
  static getAll(modelName: string): Map<string, ScopeFunction<any>> {
    return this.scopes.get(modelName) || new Map();
  }

  /**
   * Check if a scope exists
   */
  static has(modelName: string, scopeName: string): boolean {
    const modelScopes = this.scopes.get(modelName);
    if (!modelScopes) {
      return false;
    }
    return modelScopes.has(scopeName);
  }

  /**
   * Remove a scope
   */
  static remove(modelName: string, scopeName: string): void {
    const modelScopes = this.scopes.get(modelName);
    if (modelScopes) {
      modelScopes.delete(scopeName);
    }
  }

  /**
   * Clear all scopes for a model
   */
  static clear(modelName: string): void {
    this.scopes.delete(modelName);
  }

  /**
   * Clear all scopes
   */
  static clearAll(): void {
    this.scopes.clear();
  }
}

/**
 * Default scope - automatically applied to all queries
 */
export interface DefaultScopeOptions {
  /**
   * Conditions to apply
   */
  where?: Record<string, any>;

  /**
   * Order to apply
   */
  order?: string | [string, 'ASC' | 'DESC'];

  /**
   * Custom scope function
   */
  scope?: ScopeFunction<any>;
}

/**
 * Default scope registry
 */
export class DefaultScopeRegistry {
  private static defaultScopes: Map<string, DefaultScopeOptions> = new Map();

  /**
   * Register a default scope for a model
   */
  static register(modelName: string, options: DefaultScopeOptions): void {
    this.defaultScopes.set(modelName, options);
  }

  /**
   * Get default scope for a model
   */
  static get(modelName: string): DefaultScopeOptions | undefined {
    return this.defaultScopes.get(modelName);
  }

  /**
   * Remove default scope
   */
  static remove(modelName: string): void {
    this.defaultScopes.delete(modelName);
  }

  /**
   * Check if model has default scope
   */
  static has(modelName: string): boolean {
    return this.defaultScopes.has(modelName);
  }

  /**
   * Clear all default scopes
   */
  static clearAll(): void {
    this.defaultScopes.clear();
  }
}
