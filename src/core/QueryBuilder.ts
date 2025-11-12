/**
 * Query Builder
 * Provides a fluent, chainable interface for building SQL queries
 */

import { DatabaseAdapter } from '../adapters/Adapter';

type WhereCondition = Record<string, any> | string;
type WhereOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'LIKE'
  | 'ILIKE'
  | 'IN'
  | 'NOT IN'
  | 'IS NULL'
  | 'IS NOT NULL';
type OrderDirection = 'ASC' | 'DESC';

interface WhereClause {
  type: 'simple' | 'raw' | 'nested';
  condition?: Record<string, any>;
  column?: string;
  operator?: WhereOperator;
  value?: any;
  rawSql?: string;
  rawParams?: any[];
  nested?: QueryBuilder;
  connector: 'AND' | 'OR';
}

interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  first: string;
  operator: string;
  second: string;
}

interface OrderClause {
  column: string;
  direction: OrderDirection;
}

export class QueryBuilder<T = any> {
  private adapter: DatabaseAdapter;
  private tableName: string;
  private selectColumns: string[] = ['*'];
  private whereClauses: WhereClause[] = [];
  private joinClauses: JoinClause[] = [];
  private orderClauses: OrderClause[] = [];
  private groupByColumns: string[] = [];
  private havingClauses: WhereClause[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private distinctValue: boolean = false;
  private appliedScopes: Set<string> = new Set();
  private unscopedValue: boolean = false;

  constructor(adapter: DatabaseAdapter, tableName: string) {
    this.adapter = adapter;
    this.tableName = tableName;
  }

  /**
   * Specify which columns to select
   */
  select(...columns: string[]): this {
    this.selectColumns = columns.length > 0 ? columns : ['*'];
    return this;
  }

  /**
   * Add DISTINCT to query
   */
  distinct(): this {
    this.distinctValue = true;
    return this;
  }

  /**
   * Add WHERE clause with object conditions
   * @example
   * .where({ name: 'John', age: 30 })
   * .where('age > ?', 18)
   * .where('email', 'LIKE', '%@example.com')
   */
  where(condition: WhereCondition, ...args: any[]): this {
    if (typeof condition === 'string') {
      // Raw SQL: .where('age > ?', 18) or .where('email', 'LIKE', '%@example.com')
      if (args.length === 1) {
        // .where('age > ?', 18)
        this.whereClauses.push({
          type: 'raw',
          rawSql: condition,
          rawParams: [args[0]],
          connector: 'AND',
        });
      } else if (args.length === 2) {
        // .where('email', 'LIKE', '%@example.com')
        this.whereClauses.push({
          type: 'simple',
          column: condition,
          operator: args[0] as WhereOperator,
          value: args[1],
          connector: 'AND',
        });
      }
    } else {
      // Object conditions: .where({ name: 'John', age: 30 })
      this.whereClauses.push({
        type: 'simple',
        condition,
        connector: 'AND',
      });
    }
    return this;
  }

  /**
   * Add OR WHERE clause
   */
  orWhere(condition: WhereCondition, ...args: any[]): this {
    if (typeof condition === 'string') {
      if (args.length === 1) {
        this.whereClauses.push({
          type: 'raw',
          rawSql: condition,
          rawParams: [args[0]],
          connector: 'OR',
        });
      } else if (args.length === 2) {
        this.whereClauses.push({
          type: 'simple',
          column: condition,
          operator: args[0] as WhereOperator,
          value: args[1],
          connector: 'OR',
        });
      }
    } else {
      this.whereClauses.push({
        type: 'simple',
        condition,
        connector: 'OR',
      });
    }
    return this;
  }

  /**
   * Add WHERE IN clause
   */
  whereIn(column: string, values: any[]): this {
    this.whereClauses.push({
      type: 'simple',
      column,
      operator: 'IN',
      value: values,
      connector: 'AND',
    });
    return this;
  }

  /**
   * Add WHERE NOT IN clause
   */
  whereNotIn(column: string, values: any[]): this {
    this.whereClauses.push({
      type: 'simple',
      column,
      operator: 'NOT IN',
      value: values,
      connector: 'AND',
    });
    return this;
  }

  /**
   * Add WHERE NULL clause
   */
  whereNull(column: string): this {
    this.whereClauses.push({
      type: 'simple',
      column,
      operator: 'IS NULL',
      connector: 'AND',
    });
    return this;
  }

  /**
   * Add WHERE NOT NULL clause
   */
  whereNotNull(column: string): this {
    this.whereClauses.push({
      type: 'simple',
      column,
      operator: 'IS NOT NULL',
      connector: 'AND',
    });
    return this;
  }

  /**
   * Add JOIN clause
   */
  join(table: string, first: string, operator: string, second: string): this {
    this.joinClauses.push({
      type: 'INNER',
      table,
      first,
      operator,
      second,
    });
    return this;
  }

  /**
   * Add LEFT JOIN clause
   */
  leftJoin(table: string, first: string, operator: string, second: string): this {
    this.joinClauses.push({
      type: 'LEFT',
      table,
      first,
      operator,
      second,
    });
    return this;
  }

  /**
   * Add RIGHT JOIN clause
   */
  rightJoin(table: string, first: string, operator: string, second: string): this {
    this.joinClauses.push({
      type: 'RIGHT',
      table,
      first,
      operator,
      second,
    });
    return this;
  }

  /**
   * Add ORDER BY clause
   */
  order(column: string, direction: OrderDirection = 'ASC'): this {
    this.orderClauses.push({ column, direction });
    return this;
  }

  /**
   * Alias for order with DESC direction
   */
  orderBy(column: string, direction: OrderDirection = 'ASC'): this {
    return this.order(column, direction);
  }

  /**
   * Add GROUP BY clause
   */
  groupBy(...columns: string[]): this {
    this.groupByColumns.push(...columns);
    return this;
  }

  /**
   * Add HAVING clause
   */
  having(condition: WhereCondition, ...args: any[]): this {
    if (typeof condition === 'string') {
      if (args.length === 1) {
        this.havingClauses.push({
          type: 'raw',
          rawSql: condition,
          rawParams: [args[0]],
          connector: 'AND',
        });
      } else if (args.length === 2) {
        this.havingClauses.push({
          type: 'simple',
          column: condition,
          operator: args[0] as WhereOperator,
          value: args[1],
          connector: 'AND',
        });
      }
    } else {
      this.havingClauses.push({
        type: 'simple',
        condition,
        connector: 'AND',
      });
    }
    return this;
  }

  /**
   * Set LIMIT clause
   */
  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  /**
   * Set OFFSET clause
   */
  offset(value: number): this {
    this.offsetValue = value;
    return this;
  }

  /**
   * Alias for limit
   */
  take(value: number): this {
    return this.limit(value);
  }

  /**
   * Alias for offset
   */
  skip(value: number): this {
    return this.offset(value);
  }

  /**
   * Build the SQL query and parameters
   */
  toSql(): { sql: string; params: any[] } {
    const params: any[] = [];
    let sql = 'SELECT ';

    // DISTINCT
    if (this.distinctValue) {
      sql += 'DISTINCT ';
    }

    // SELECT columns
    sql += this.selectColumns.join(', ');

    // FROM
    sql += ` FROM ${this.adapter.escapeIdentifier(this.tableName)}`;

    // JOINs
    if (this.joinClauses.length > 0) {
      for (const join of this.joinClauses) {
        sql += ` ${join.type} JOIN ${this.adapter.escapeIdentifier(join.table)}`;
        sql += ` ON ${join.first} ${join.operator} ${join.second}`;
      }
    }

    // WHERE
    if (this.whereClauses.length > 0) {
      const whereStr = this.buildWhereClause(this.whereClauses, params);
      sql += ` WHERE ${whereStr}`;
    }

    // GROUP BY
    if (this.groupByColumns.length > 0) {
      sql += ` GROUP BY ${this.groupByColumns.join(', ')}`;
    }

    // HAVING
    if (this.havingClauses.length > 0) {
      const havingStr = this.buildWhereClause(this.havingClauses, params);
      sql += ` HAVING ${havingStr}`;
    }

    // ORDER BY
    if (this.orderClauses.length > 0) {
      const orderParts = this.orderClauses.map(order => `${order.column} ${order.direction}`);
      sql += ` ORDER BY ${orderParts.join(', ')}`;
    }

    // LIMIT
    if (this.limitValue !== undefined) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    // OFFSET
    if (this.offsetValue !== undefined) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    return { sql, params };
  }

  /**
   * Escape a column name, handling qualified names (table.column)
   */
  private escapeColumn(column: string): string {
    if (column.includes('.')) {
      const parts = column.split('.');
      return parts.map(p => this.adapter.escapeIdentifier(p)).join('.');
    }
    return this.adapter.escapeIdentifier(column);
  }

  /**
   * Build WHERE clause string
   */
  private buildWhereClause(clauses: WhereClause[], params: any[]): string {
    const parts: string[] = [];

    for (let i = 0; i < clauses.length; i++) {
      const clause = clauses[i];
      if (!clause) continue;

      const connector = i === 0 ? '' : ` ${clause.connector} `;

      if (clause.type === 'raw' && clause.rawSql) {
        // Raw SQL with placeholders
        let sql = clause.rawSql;
        if (clause.rawParams) {
          for (const param of clause.rawParams) {
            params.push(param);
            sql = sql.replace('?', `$${params.length}`);
          }
        }
        parts.push(connector + sql);
      } else if (clause.type === 'simple') {
        if (clause.condition) {
          // Object conditions
          const condParts: string[] = [];
          for (const [key, value] of Object.entries(clause.condition)) {
            params.push(value);
            condParts.push(`${this.escapeColumn(key)} = $${params.length}`);
          }
          parts.push(connector + condParts.join(' AND '));
        } else if (clause.column) {
          // Column operator value
          const escapedColumn = this.escapeColumn(clause.column);
          if (clause.operator === 'IS NULL') {
            parts.push(connector + `${escapedColumn} IS NULL`);
          } else if (clause.operator === 'IS NOT NULL') {
            parts.push(connector + `${escapedColumn} IS NOT NULL`);
          } else if (clause.operator === 'IN' || clause.operator === 'NOT IN') {
            const values = clause.value as any[];
            const placeholders = values.map(v => {
              params.push(v);
              return `$${params.length}`;
            });
            parts.push(
              connector + `${escapedColumn} ${clause.operator} (${placeholders.join(', ')})`
            );
          } else if (clause.operator) {
            params.push(clause.value);
            parts.push(connector + `${escapedColumn} ${clause.operator} $${params.length}`);
          }
        }
      }
    }

    return parts.join('');
  }

  /**
   * Execute query and return all results
   */
  async all(): Promise<T[]> {
    const { sql, params } = this.toSql();
    const result = await this.adapter.query<T>(sql, params);
    return result.rows;
  }

  /**
   * Execute query and return first result
   */
  async first(): Promise<T | null> {
    const originalLimit = this.limitValue;
    this.limit(1);
    const { sql, params } = this.toSql();
    this.limitValue = originalLimit; // Restore original limit

    const result = await this.adapter.query<T>(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Execute query and return last result
   */
  async last(): Promise<T | null> {
    // Reverse the order and get first
    const reversedOrders = this.orderClauses.map(order => ({
      column: order.column,
      direction: (order.direction === 'ASC' ? 'DESC' : 'ASC') as OrderDirection,
    }));

    const originalOrders = [...this.orderClauses];
    this.orderClauses = reversedOrders;

    const result = await this.first();

    this.orderClauses = originalOrders; // Restore original orders
    return result;
  }

  /**
   * Get count of records
   */
  async count(): Promise<number> {
    const originalSelect = [...this.selectColumns];
    const originalLimit = this.limitValue;
    const originalOffset = this.offsetValue;
    const originalOrder = [...this.orderClauses];

    this.select('COUNT(*) as count');
    this.limitValue = undefined;
    this.offsetValue = undefined;
    this.orderClauses = []; // Remove ORDER BY for count queries

    const { sql, params } = this.toSql();

    // Restore original values
    this.selectColumns = originalSelect;
    this.limitValue = originalLimit;
    this.offsetValue = originalOffset;
    this.orderClauses = originalOrder;

    const result = await this.adapter.query<{ count: string }>(sql, params);
    return parseInt(result.rows[0]?.count || '0', 10);
  }

  /**
   * Check if any records exist
   */
  async exists(): Promise<boolean> {
    const count = await this.count();
    return count > 0;
  }

  /**
   * Execute query and return results with pagination info
   */
  async paginate(
    page: number = 1,
    perPage: number = 20
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  }> {
    const total = await this.count();
    const offset = (page - 1) * perPage;

    this.limit(perPage).offset(offset);
    const data = await this.all();

    return {
      data,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  /**
   * Apply a named scope (to be used with Model scopes)
   */
  scope(scopeName: string, ..._args: any[]): this {
    this.appliedScopes.add(scopeName);
    return this;
  }

  /**
   * Remove all scopes (including default scope)
   */
  unscoped(): this {
    this.unscopedValue = true;
    this.appliedScopes.clear();
    return this;
  }

  /**
   * Check if a scope has been applied
   */
  hasScope(scopeName: string): boolean {
    return this.appliedScopes.has(scopeName);
  }

  /**
   * Check if query is unscoped
   */
  isUnscoped(): boolean {
    return this.unscopedValue;
  }

  /**
   * Get applied scope names
   */
  getAppliedScopes(): string[] {
    return Array.from(this.appliedScopes);
  }

  /**
   * Clone the query builder
   */
  clone(): QueryBuilder<T> {
    const cloned = new QueryBuilder<T>(this.adapter, this.tableName);
    cloned.selectColumns = [...this.selectColumns];
    cloned.whereClauses = [...this.whereClauses];
    cloned.joinClauses = [...this.joinClauses];
    cloned.orderClauses = [...this.orderClauses];
    cloned.groupByColumns = [...this.groupByColumns];
    cloned.havingClauses = [...this.havingClauses];
    cloned.limitValue = this.limitValue;
    cloned.offsetValue = this.offsetValue;
    cloned.distinctValue = this.distinctValue;
    cloned.appliedScopes = new Set(this.appliedScopes);
    cloned.unscopedValue = this.unscopedValue;
    return cloned;
  }
}
