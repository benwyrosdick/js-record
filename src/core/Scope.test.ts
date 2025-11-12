/**
 * Comprehensive tests for Scope functionality
 * Tests query scopes and default scopes
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ScopeRegistry, DefaultScopeRegistry } from './Scope';
import { QueryBuilder } from './QueryBuilder';
import { Model } from './Model';
import { DatabaseAdapter } from '../adapters/Adapter';

// Mock adapter for testing
class MockAdapter extends DatabaseAdapter {
  constructor(config: any = {}) {
    super(config);
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async query<T = any>(
    _sql: string,
    _params?: any[]
  ): Promise<{ rows: T[]; rowCount: number; fields?: any[] }> {
    return { rows: [], rowCount: 0 };
  }

  async execute(
    _sql: string,
    _params?: any[]
  ): Promise<{ rowCount: number; insertId?: number | string }> {
    return { rowCount: 1 };
  }

  async beginTransaction(): Promise<any> {
    return {
      query: this.query.bind(this),
      execute: this.execute.bind(this),
      commit: async () => {},
      rollback: async () => {},
      isActive: () => true,
    };
  }

  async getTableInfo(_tableName: string): Promise<any> {
    return {
      name: _tableName,
      schema: 'public',
      columns: [],
      indexes: [],
    };
  }

  async getColumns(_tableName: string): Promise<any[]> {
    return [];
  }

  async tableExists(_tableName: string): Promise<boolean> {
    return true;
  }

  escapeIdentifier(identifier: string): string {
    return `"${identifier}"`;
  }

  formatValue(value: any): string {
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    return String(value);
  }

  convertPlaceholders(sql: string, params: any[]): { sql: string; params: any[] } {
    return { sql, params };
  }

  async ping(): Promise<boolean> {
    return true;
  }

  async getVersion(): Promise<string> {
    return 'mock-1.0.0';
  }

  async getTables(): Promise<string[]> {
    return [];
  }

  async truncate(_tableName: string): Promise<void> {
    // Mock implementation
  }

  async dropTable(_tableName: string): Promise<void> {
    // Mock implementation
  }
}

// Test model for scope testing
class TestScopeModel extends Model {
  static config = {
    tableName: 'test_scope_models',
    primaryKey: 'id',
    timestamps: true,
    mapAttributes: true,
  };

  static modelName = 'TestScopeModel';
}

describe('ScopeRegistry', () => {
  beforeEach(() => {
    // Clear all scopes before each test
    ScopeRegistry.clearAll();
  });

  afterEach(() => {
    // Clean up after each test
    ScopeRegistry.clearAll();
  });

  describe('Registration', () => {
    it('should register a scope', () => {
      const scopeFn = (query: QueryBuilder) => query.where('active', true);
      ScopeRegistry.register('TestModel', 'active', scopeFn);

      expect(ScopeRegistry.has('TestModel', 'active')).toBe(true);
    });

    it('should register multiple scopes for same model', () => {
      const activeFn = (query: QueryBuilder) => query.where('active', true);
      const publishedFn = (query: QueryBuilder) => query.where('published', true);

      ScopeRegistry.register('TestModel', 'active', activeFn);
      ScopeRegistry.register('TestModel', 'published', publishedFn);

      expect(ScopeRegistry.has('TestModel', 'active')).toBe(true);
      expect(ScopeRegistry.has('TestModel', 'published')).toBe(true);
    });

    it('should register scopes for different models', () => {
      const userScope = (query: QueryBuilder) => query.where('role', 'user');
      const postScope = (query: QueryBuilder) => query.where('published', true);

      ScopeRegistry.register('User', 'users', userScope);
      ScopeRegistry.register('Post', 'published', postScope);

      expect(ScopeRegistry.has('User', 'users')).toBe(true);
      expect(ScopeRegistry.has('Post', 'published')).toBe(true);
      expect(ScopeRegistry.has('User', 'published')).toBe(false);
      expect(ScopeRegistry.has('Post', 'users')).toBe(false);
    });

    it('should overwrite existing scope', () => {
      const originalFn = (query: QueryBuilder) => query.where('active', true);
      const newFn = (query: QueryBuilder) => query.where('active', false);

      ScopeRegistry.register('TestModel', 'active', originalFn);
      expect(ScopeRegistry.get('TestModel', 'active')).toBe(originalFn);

      ScopeRegistry.register('TestModel', 'active', newFn);
      expect(ScopeRegistry.get('TestModel', 'active')).toBe(newFn);
    });
  });

  describe('Retrieval', () => {
    it('should get registered scope', () => {
      const scopeFn = (query: QueryBuilder) => query.where('active', true);
      ScopeRegistry.register('TestModel', 'active', scopeFn);

      const retrieved = ScopeRegistry.get('TestModel', 'active');
      expect(retrieved).toBe(scopeFn);
    });

    it('should return undefined for non-existent scope', () => {
      const retrieved = ScopeRegistry.get('TestModel', 'nonexistent');
      expect(retrieved).toBeUndefined();
    });

    it('should return undefined for non-existent model', () => {
      const retrieved = ScopeRegistry.get('NonExistentModel', 'active');
      expect(retrieved).toBeUndefined();
    });

    it('should get all scopes for a model', () => {
      const activeFn = (query: QueryBuilder) => query.where('active', true);
      const publishedFn = (query: QueryBuilder) => query.where('published', true);

      ScopeRegistry.register('TestModel', 'active', activeFn);
      ScopeRegistry.register('TestModel', 'published', publishedFn);

      const scopes = ScopeRegistry.getAll('TestModel');
      expect(scopes.get('active')).toBe(activeFn);
      expect(scopes.get('published')).toBe(publishedFn);
    });

    it('should return empty object for model with no scopes', () => {
      const scopes = ScopeRegistry.getAll('NonExistentModel');
      expect(scopes.size).toBe(0);
    });
  });

  describe('Existence Checks', () => {
    it('should return true for existing scope', () => {
      const scopeFn = (query: QueryBuilder) => query.where('active', true);
      ScopeRegistry.register('TestModel', 'active', scopeFn);

      expect(ScopeRegistry.has('TestModel', 'active')).toBe(true);
    });

    it('should return false for non-existent scope', () => {
      expect(ScopeRegistry.has('TestModel', 'nonexistent')).toBe(false);
    });

    it('should return false for non-existent model', () => {
      expect(ScopeRegistry.has('NonExistentModel', 'active')).toBe(false);
    });
  });

  describe('Removal', () => {
    it('should remove a scope', () => {
      const scopeFn = (query: QueryBuilder) => query.where('active', true);
      ScopeRegistry.register('TestModel', 'active', scopeFn);

      expect(ScopeRegistry.has('TestModel', 'active')).toBe(true);

      ScopeRegistry.remove('TestModel', 'active');
      expect(ScopeRegistry.has('TestModel', 'active')).toBe(false);
    });

    it('should handle removal of non-existent scope', () => {
      expect(() => ScopeRegistry.remove('TestModel', 'nonexistent')).not.toThrow();
    });

    it('should handle removal from non-existent model', () => {
      expect(() => ScopeRegistry.remove('NonExistentModel', 'active')).not.toThrow();
    });

    it('should clear all scopes for a model', () => {
      const activeFn = (query: QueryBuilder) => query.where('active', true);
      const publishedFn = (query: QueryBuilder) => query.where('published', true);

      ScopeRegistry.register('TestModel', 'active', activeFn);
      ScopeRegistry.register('TestModel', 'published', publishedFn);

      expect(ScopeRegistry.has('TestModel', 'active')).toBe(true);
      expect(ScopeRegistry.has('TestModel', 'published')).toBe(true);

      ScopeRegistry.clear('TestModel');
      expect(ScopeRegistry.has('TestModel', 'active')).toBe(false);
      expect(ScopeRegistry.has('TestModel', 'published')).toBe(false);
    });

    it('should clear all scopes', () => {
      const activeFn = (query: QueryBuilder) => query.where('active', true);
      const publishedFn = (query: QueryBuilder) => query.where('published', true);

      ScopeRegistry.register('TestModel', 'active', activeFn);
      ScopeRegistry.register('TestModel', 'published', publishedFn);
      ScopeRegistry.register('User', 'users', query => query.where('role', 'user'));

      expect(ScopeRegistry.has('TestModel', 'active')).toBe(true);
      expect(ScopeRegistry.has('User', 'users')).toBe(true);

      ScopeRegistry.clearAll();
      expect(ScopeRegistry.has('TestModel', 'active')).toBe(false);
      expect(ScopeRegistry.has('TestModel', 'published')).toBe(false);
      expect(ScopeRegistry.has('User', 'users')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty scope name', () => {
      const scopeFn = (query: QueryBuilder) => query.where('active', true);
      expect(() => ScopeRegistry.register('TestModel', '', scopeFn)).not.toThrow();
      expect(ScopeRegistry.has('TestModel', '')).toBe(true);
    });

    it('should handle special characters in scope name', () => {
      const scopeFn = (query: QueryBuilder) => query.where('active', true);
      expect(() => ScopeRegistry.register('TestModel', 'scope-with-dashes', scopeFn)).not.toThrow();
      expect(ScopeRegistry.has('TestModel', 'scope-with-dashes')).toBe(true);
    });

    it('should handle null scope function', () => {
      expect(() => ScopeRegistry.register('TestModel', 'nullScope', null as any)).not.toThrow();
      expect(ScopeRegistry.get('TestModel', 'nullScope')).toBeNull();
    });
  });
});

describe('DefaultScopeRegistry', () => {
  beforeEach(() => {
    DefaultScopeRegistry.clearAll();
  });

  afterEach(() => {
    DefaultScopeRegistry.clearAll();
  });

  describe('Registration', () => {
    it('should register default scope with where clause', () => {
      const options = { where: { active: true } };
      DefaultScopeRegistry.register('TestModel', options);

      const retrieved = DefaultScopeRegistry.get('TestModel');
      expect(retrieved).toEqual(options);
    });

    it('should register default scope with order clause', () => {
      const options = { order: ['created_at', 'DESC'] as [string, 'DESC'] };
      DefaultScopeRegistry.register('TestModel', options);

      const retrieved = DefaultScopeRegistry.get('TestModel');
      expect(retrieved).toEqual(options);
    });

    it('should register default scope with scope function', () => {
      const scopeFn = (query: QueryBuilder) => query.where('published', true);
      const options = { scope: scopeFn };
      DefaultScopeRegistry.register('TestModel', options);

      const retrieved = DefaultScopeRegistry.get('TestModel');
      expect(retrieved).toEqual(options);
    });

    it('should register complex default scope', () => {
      const scopeFn = (query: QueryBuilder) => query.where('published', true);
      const options = {
        where: { active: true },
        order: ['created_at', 'DESC'] as [string, 'DESC'],
        scope: scopeFn,
      };
      DefaultScopeRegistry.register('TestModel', options);

      const retrieved = DefaultScopeRegistry.get('TestModel');
      expect(retrieved).toEqual(options);
    });

    it('should overwrite existing default scope', () => {
      const originalOptions = { where: { active: true } };
      const newOptions = { where: { active: false } };

      DefaultScopeRegistry.register('TestModel', originalOptions);
      expect(DefaultScopeRegistry.get('TestModel')).toEqual(originalOptions);

      DefaultScopeRegistry.register('TestModel', newOptions);
      expect(DefaultScopeRegistry.get('TestModel')).toEqual(newOptions);
    });
  });

  describe('Retrieval', () => {
    it('should get registered default scope', () => {
      const options = { where: { active: true } };
      DefaultScopeRegistry.register('TestModel', options);

      const retrieved = DefaultScopeRegistry.get('TestModel');
      expect(retrieved).toEqual(options);
    });

    it('should return undefined for non-existent default scope', () => {
      const retrieved = DefaultScopeRegistry.get('NonExistentModel');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Removal', () => {
    it('should remove default scope', () => {
      const options = { where: { active: true } };
      DefaultScopeRegistry.register('TestModel', options);

      expect(DefaultScopeRegistry.get('TestModel')).toEqual(options);

      DefaultScopeRegistry.remove('TestModel');
      expect(DefaultScopeRegistry.get('TestModel')).toBeUndefined();
    });

    it('should handle removal of non-existent default scope', () => {
      expect(() => DefaultScopeRegistry.remove('NonExistentModel')).not.toThrow();
    });

    it('should clear all default scopes', () => {
      DefaultScopeRegistry.register('TestModel', { where: { active: true } });
      DefaultScopeRegistry.register('User', { where: { role: 'user' } });

      expect(DefaultScopeRegistry.get('TestModel')).toBeDefined();
      expect(DefaultScopeRegistry.get('User')).toBeDefined();

      DefaultScopeRegistry.clearAll();
      expect(DefaultScopeRegistry.get('TestModel')).toBeUndefined();
      expect(DefaultScopeRegistry.get('User')).toBeUndefined();
    });
  });
});

describe('Scope Integration', () => {
  let mockAdapter: MockAdapter;

  beforeEach(() => {
    mockAdapter = new MockAdapter();
    Model.setAdapter(mockAdapter);
    ScopeRegistry.clearAll();
    DefaultScopeRegistry.clearAll();
  });

  afterEach(() => {
    ScopeRegistry.clearAll();
    DefaultScopeRegistry.clearAll();
  });

  describe('Scope Function Execution', () => {
    it('should execute scope function with parameters', () => {
      const scopeFn = (query: QueryBuilder, minAge: number) => query.where('age', '>=', minAge);
      ScopeRegistry.register('TestScopeModel', 'adults', scopeFn);

      const query = TestScopeModel.query();
      const scopedQuery = scopeFn(query, 18);

      expect(scopedQuery).toBe(query);
      const { sql, params } = query.toSql();
      expect(sql).toContain('"age" >= $1');
      expect(params).toEqual([18]);
    });

    it('should execute scope function with multiple parameters', () => {
      const scopeFn = (query: QueryBuilder, status: string, limit: number) =>
        query.where({ status }).limit(limit);
      ScopeRegistry.register('TestScopeModel', 'recent', scopeFn);

      const query = TestScopeModel.query();
      scopeFn(query, 'active', 10);

      const { sql, params } = query.toSql();
      expect(sql).toContain('"status" = $1');
      expect(sql).toContain('LIMIT 10');
      expect(params).toEqual(['active']);
    });

    it('should handle scope function that returns modified query', () => {
      const scopeFn = (query: QueryBuilder) => {
        return query.where('active', true).orderBy('created_at', 'DESC');
      };
      ScopeRegistry.register('TestScopeModel', 'activeOrdered', scopeFn);

      const query = TestScopeModel.query();
      const result = scopeFn(query);

      const { sql } = result.toSql();
      expect(sql).toContain('"active" = $1');
      expect(sql).toContain('ORDER BY created_at DESC');
      expect(result).toBe(query);
    });
  });

  describe('Default Scope Application', () => {
    it('should apply default scope to query', () => {
      DefaultScopeRegistry.register('TestScopeModel', {
        where: { active: true },
        order: ['created_at', 'DESC'],
      });

      const query = TestScopeModel.query();
      const { sql, params } = query.toSql();

      expect(sql).toContain('"active" = $1');
      expect(sql).toContain('ORDER BY created_at DESC');
      expect(params).toEqual([true]);
    });

    it('should apply default scope with scope function', () => {
      const scopeFn = (query: QueryBuilder) => query.where('published', true);
      DefaultScopeRegistry.register('TestScopeModel', {
        where: { active: true },
        scope: scopeFn,
      });

      const query = TestScopeModel.query();
      const { sql, params } = query.toSql();

      expect(sql).toContain('"active" = $1');
      expect(sql).toContain('"published" = $2');
      expect(params).toEqual([true, true]);
    });

    it('should not apply default scope to unscoped query', () => {
      DefaultScopeRegistry.register('TestScopeModel', {
        where: { active: true },
      });

      const query = TestScopeModel.unscoped();
      const { sql } = query.toSql();

      expect(sql).not.toContain('WHERE');
      expect(query.isUnscoped()).toBe(true);
    });

    it('should handle default scope with string order', () => {
      DefaultScopeRegistry.register('TestScopeModel', {
        order: 'created_at',
      });

      const query = TestScopeModel.query();
      const { sql } = query.toSql();

      expect(sql).toContain('ORDER BY created_at');
    });

    it('should handle default scope with array order', () => {
      DefaultScopeRegistry.register('TestScopeModel', {
        order: ['created_at', 'DESC'],
      });

      const query = TestScopeModel.query();
      const { sql } = query.toSql();

      expect(sql).toContain('ORDER BY created_at DESC');
    });
  });

  describe('Scope Chaining', () => {
    it('should allow chaining multiple scopes', () => {
      const activeFn = (query: QueryBuilder) => query.where('active', true);
      const publishedFn = (query: QueryBuilder) => query.where('published', true);

      ScopeRegistry.register('TestScopeModel', 'active', activeFn);
      ScopeRegistry.register('TestScopeModel', 'published', publishedFn);

      const query = TestScopeModel.query();
      activeFn(query);
      publishedFn(query);

      const { sql, params } = query.toSql();
      expect(sql).toContain('"active" = $1');
      expect(sql).toContain('"published" = $2');
      expect(params).toEqual([true, true]);
    });

    it('should combine default scope with additional scopes', () => {
      DefaultScopeRegistry.register('TestScopeModel', {
        where: { active: true },
      });

      const recentFn = (query: QueryBuilder) => query.where('recent', true);
      ScopeRegistry.register('TestScopeModel', 'recent', recentFn);

      const query = TestScopeModel.query();
      recentFn(query);

      const { sql, params } = query.toSql();
      expect(sql).toContain('"active" = $1');
      expect(sql).toContain('"recent" = $2');
      expect(params).toEqual([true, true]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty default scope options', () => {
      DefaultScopeRegistry.register('TestScopeModel', {});

      const query = TestScopeModel.query();
      const { sql } = query.toSql();

      expect(sql).toBe('SELECT * FROM "test_scope_models"');
    });

    it('should handle scope function that throws error', () => {
      const errorFn = (query: QueryBuilder) => {
        throw new Error('Scope error');
      };
      ScopeRegistry.register('TestScopeModel', 'errorScope', errorFn);

      const query = TestScopeModel.query();
      expect(() => errorFn(query)).toThrow('Scope error');
    });

    it('should handle null parameters in scope function', () => {
      const scopeFn = (query: QueryBuilder, value: any) => query.where('optional', value);
      ScopeRegistry.register('TestScopeModel', 'optional', scopeFn);

      const query = TestScopeModel.query();
      scopeFn(query, null);

      const { sql, params } = query.toSql();
      expect(sql).toContain('"optional" = $1');
      expect(params[0]).toBeNull();
    });
  });
});
