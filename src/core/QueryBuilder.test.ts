/**
 * Comprehensive tests for QueryBuilder class
 * Tests fluent query building functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { QueryBuilder } from './QueryBuilder';
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

describe('QueryBuilder', () => {
  let mockAdapter: MockAdapter;
  let queryBuilder: QueryBuilder;

  beforeEach(() => {
    mockAdapter = new MockAdapter();
    queryBuilder = new QueryBuilder(mockAdapter, 'test_table');
  });

  afterEach(() => {
    // Clean up if needed
  });

  describe('Constructor', () => {
    it('should create query builder with adapter and table', () => {
      expect(queryBuilder).toBeInstanceOf(QueryBuilder);
    });

    it('should initialize with default select columns', () => {
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('SELECT *');
    });

    it('should initialize with empty where clauses', () => {
      const { sql } = queryBuilder.toSql();
      expect(sql).not.toContain('WHERE');
    });
  });

  describe('Select Methods', () => {
    it('should set select columns', () => {
      queryBuilder.select('id', 'name', 'email');
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('SELECT id, name, email');
    });

    it('should handle empty select', () => {
      queryBuilder.select();
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('SELECT *');
    });

    it('should add DISTINCT', () => {
      queryBuilder.distinct();
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('SELECT DISTINCT');
    });

    it('should combine distinct with select', () => {
      queryBuilder.distinct().select('name');
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('SELECT DISTINCT name');
    });
  });

  describe('Where Methods', () => {
    it('should add simple where clause with object', () => {
      queryBuilder.where({ name: 'John', age: 30 });
      const { sql, params } = queryBuilder.toSql();
      expect(sql).toContain('WHERE');
      expect(sql).toContain('"name" = $1');
      expect(sql).toContain('"age" = $2');
      expect(params).toEqual(['John', 30]);
    });

    it('should add where clause with raw SQL', () => {
      queryBuilder.where('age > ?', 18);
      const { sql, params } = queryBuilder.toSql();
      expect(sql).toContain('WHERE age > $1');
      expect(params).toEqual([18]);
    });

    it('should add where clause with column and operator', () => {
      queryBuilder.where('email', 'LIKE', '%@example.com');
      const { sql, params } = queryBuilder.toSql();
      expect(sql).toContain('WHERE "email" LIKE $1');
      expect(params).toEqual(['%@example.com']);
    });

    it('should add OR where clause', () => {
      queryBuilder.where({ name: 'John' }).orWhere({ name: 'Jane' });
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('WHERE');
      expect(sql).toContain('"name" = $1');
      expect(sql).toContain('OR "name" = $2');
    });

    it('should add WHERE IN clause', () => {
      queryBuilder.whereIn('id', [1, 2, 3]);
      const { sql, params } = queryBuilder.toSql();
      expect(sql).toContain('WHERE "id" IN ($1, $2, $3)');
      expect(params).toEqual([1, 2, 3]);
    });

    it('should add WHERE NOT IN clause', () => {
      queryBuilder.whereNotIn('id', [1, 2, 3]);
      const { sql, params } = queryBuilder.toSql();
      expect(sql).toContain('WHERE "id" NOT IN ($1, $2, $3)');
      expect(params).toEqual([1, 2, 3]);
    });

    it('should add WHERE NULL clause', () => {
      queryBuilder.whereNull('deleted_at');
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('WHERE "deleted_at" IS NULL');
    });

    it('should add WHERE NOT NULL clause', () => {
      queryBuilder.whereNotNull('name');
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('WHERE "name" IS NOT NULL');
    });

    it('should chain multiple where conditions', () => {
      queryBuilder
        .where({ name: 'John' })
        .where('age', '>', 18)
        .whereIn('status', ['active', 'pending']);
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('WHERE');
      expect(sql).toContain('"name" = $1');
      expect(sql).toContain('"age" > $2');
      expect(sql).toContain('"status" IN ($3, $4)');
    });
  });

  describe('Join Methods', () => {
    it('should add INNER JOIN', () => {
      queryBuilder.join('posts', 'users.id', '=', 'posts.user_id');
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('INNER JOIN "posts" ON users.id = posts.user_id');
    });

    it('should add LEFT JOIN', () => {
      queryBuilder.leftJoin('posts', 'users.id', '=', 'posts.user_id');
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('LEFT JOIN "posts" ON users.id = posts.user_id');
    });

    it('should add RIGHT JOIN', () => {
      queryBuilder.rightJoin('posts', 'users.id', '=', 'posts.user_id');
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('RIGHT JOIN "posts" ON users.id = posts.user_id');
    });

    it('should chain multiple joins', () => {
      queryBuilder
        .join('posts', 'users.id', '=', 'posts.user_id')
        .leftJoin('comments', 'posts.id', '=', 'comments.post_id');
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('INNER JOIN "posts" ON users.id = posts.user_id');
      expect(sql).toContain('LEFT JOIN "comments" ON posts.id = comments.post_id');
    });
  });

  describe('Order Methods', () => {
    it('should add ORDER BY clause', () => {
      queryBuilder.orderBy('name', 'ASC');
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('ORDER BY name ASC');
    });

    it('should add order with default direction', () => {
      queryBuilder.order('created_at');
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('ORDER BY created_at ASC');
    });

    it('should add DESC order', () => {
      queryBuilder.orderBy('created_at', 'DESC');
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('ORDER BY created_at DESC');
    });

    it('should chain multiple order clauses', () => {
      queryBuilder.orderBy('name', 'ASC').orderBy('created_at', 'DESC');
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('ORDER BY name ASC, created_at DESC');
    });
  });

  describe('Group and Limit Methods', () => {
    it('should add GROUP BY clause', () => {
      queryBuilder.groupBy('category', 'status');
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('GROUP BY category, status');
    });

    it('should add HAVING clause', () => {
      queryBuilder.having('count', '>', 5);
      const { sql, params } = queryBuilder.toSql();
      expect(sql).toContain('HAVING "count" > $1');
      expect(params).toEqual([5]);
    });

    it('should add LIMIT clause', () => {
      queryBuilder.limit(10);
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('LIMIT 10');
    });

    it('should add OFFSET clause', () => {
      queryBuilder.offset(20);
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('OFFSET 20');
    });

    it('should use take as alias for limit', () => {
      queryBuilder.take(5);
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('LIMIT 5');
    });

    it('should use skip as alias for offset', () => {
      queryBuilder.skip(15);
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('OFFSET 15');
    });
  });

  describe('Execution Methods', () => {
    it('should execute all query', async () => {
      const results = await queryBuilder.all();
      expect(results).toEqual([]);
    });

    it('should execute first query', async () => {
      const result = await queryBuilder.first();
      expect(result).toBeNull();
    });

    it('should execute last query', async () => {
      const result = await queryBuilder.last();
      expect(result).toBeNull();
    });

    it('should execute count query', async () => {
      const count = await queryBuilder.count();
      expect(count).toBe(0);
    });

    it('should execute exists query', async () => {
      const exists = await queryBuilder.exists();
      expect(exists).toBe(false);
    });

    it('should execute paginate query', async () => {
      const result = await queryBuilder.paginate(1, 10);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(10);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('Method Chaining', () => {
    it('should chain multiple methods', () => {
      const { sql } = queryBuilder
        .select('id', 'name')
        .where('age', '>', 18)
        .orderBy('name')
        .limit(10)
        .toSql();

      expect(sql).toContain('SELECT id, name');
      expect(sql).toContain('WHERE "age" > $1');
      expect(sql).toContain('ORDER BY name ASC');
      expect(sql).toContain('LIMIT 10');
    });

    it('should return this for chaining', () => {
      const result = queryBuilder.select('name').where({ active: true });
      expect(result).toBe(queryBuilder);
    });
  });

  describe('SQL Generation', () => {
    it('should generate correct SQL for complex query', () => {
      queryBuilder
        .select('users.id', 'users.name', 'COUNT(posts.id) as post_count')
        .join('posts', 'users.id', '=', 'posts.user_id')
        .where('users.active', '=', true)
        .whereNotNull('posts.published_at')
        .groupBy('users.id', 'users.name')
        .having('post_count', '>', 5)
        .orderBy('post_count', 'DESC')
        .limit(20);

      const { sql, params } = queryBuilder.toSql();

      expect(sql).toContain('SELECT users.id, users.name, COUNT(posts.id) as post_count');
      expect(sql).toContain('FROM "test_table"');
      expect(sql).toContain('INNER JOIN "posts" ON users.id = posts.user_id');
      expect(sql).toContain('WHERE "users"."active" = $1');
      expect(sql).toContain('"posts"."published_at" IS NOT NULL');
      expect(sql).toContain('GROUP BY users.id, users.name');
      expect(sql).toContain('HAVING "post_count" > $2');
      expect(sql).toContain('ORDER BY post_count DESC');
      expect(sql).toContain('LIMIT 20');
      expect(params).toEqual([true, 5]);
    });

    it('should handle qualified column names', () => {
      queryBuilder.where('users.name', 'John').orderBy('posts.created_at');
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('"users"."name" = $1');
      expect(sql).toContain('ORDER BY posts.created_at ASC');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays in whereIn', () => {
      queryBuilder.whereIn('id', []);
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('WHERE "id" IN ()');
    });

    it('should handle null values', () => {
      queryBuilder.where({ name: null });
      const { sql, params } = queryBuilder.toSql();
      expect(sql).toContain('"name" = $1');
      expect(params[0]).toBeNull();
    });

    it('should escape identifiers properly', () => {
      queryBuilder.select('table.column').where('table.name', 'value');
      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('table.column');
      expect(sql).toContain('"table"."name" = $1');
    });

    it('should handle complex boolean logic', () => {
      queryBuilder
        .where({ active: true })
        .orWhere({ status: 'pending' })
        .where('created_at', '>', '2023-01-01');

      const { sql } = queryBuilder.toSql();
      expect(sql).toContain('WHERE "active" = $1');
      expect(sql).toContain('OR "status" = $2');
      expect(sql).toContain('"created_at" > $3');
    });
  });

  describe('Clone Method', () => {
    it('should create independent clone', () => {
      queryBuilder.select('id').where({ name: 'John' });
      const clone = queryBuilder.clone();

      // Modify original
      queryBuilder.select('email').limit(10);

      // Clone should not be affected
      const originalSql = queryBuilder.toSql().sql;
      const cloneSql = clone.toSql().sql;

      expect(originalSql).toContain('SELECT email');
      expect(originalSql).toContain('LIMIT 10');
      expect(cloneSql).toContain('SELECT id');
      expect(cloneSql).not.toContain('LIMIT 10');
    });
  });

  describe('Scope Methods', () => {
    it('should track applied scopes', () => {
      queryBuilder.scope('active');
      expect(queryBuilder.hasScope('active')).toBe(true);
      expect(queryBuilder.getAppliedScopes()).toEqual(['active']);
    });

    it('should handle unscoped queries', () => {
      queryBuilder.unscoped();
      expect(queryBuilder.isUnscoped()).toBe(true);
      expect(queryBuilder.getAppliedScopes()).toEqual([]);
    });

    it('should clear scopes when unscoped', () => {
      queryBuilder.scope('active').scope('published');
      expect(queryBuilder.getAppliedScopes()).toEqual(['active', 'published']);

      queryBuilder.unscoped();
      expect(queryBuilder.isUnscoped()).toBe(true);
      expect(queryBuilder.getAppliedScopes()).toEqual([]);
    });
  });
});
