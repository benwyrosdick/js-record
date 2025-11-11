/**
 * PostgreSQL Database Adapter
 * Implements the DatabaseAdapter interface for PostgreSQL databases
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { DatabaseAdapter } from './Adapter';
import {
  ConnectionConfig,
  QueryResult,
  ExecuteResult,
  Transaction,
  TableInfo,
  ColumnInfo,
  IndexInfo,
  FieldInfo,
  PreparedStatement
} from './types';

export class PostgresAdapter extends DatabaseAdapter {
  private pool: Pool | null = null;

  constructor(config: ConnectionConfig) {
    super(config);
  }

  /**
   * Connect to PostgreSQL database
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    const poolConfig: PoolConfig = this.config.connectionString
      ? { connectionString: this.config.connectionString }
      : {
          host: this.config.host || 'localhost',
          port: this.config.port || 5432,
          database: this.config.database,
          user: this.config.user,
          password: this.config.password,
          ssl: this.config.ssl,
          max: this.config.poolSize || 10,
          connectionTimeoutMillis: this.config.connectionTimeoutMillis || 30000,
          idleTimeoutMillis: this.config.idleTimeoutMillis || 30000
        };

    this.pool = new Pool(poolConfig);

    // Test the connection
    try {
      const client = await this.pool.connect();
      client.release();
      this.connected = true;
    } catch (error) {
      this.pool = null;
      throw new Error(`Failed to connect to PostgreSQL: ${(error as Error).message}`);
    }
  }

  /**
   * Disconnect from PostgreSQL database
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.connected = false;
    }
  }

  /**
   * Execute a SELECT query
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    this.ensureConnected();

    try {
      const result = await this.pool!.query(sql, params);
      
      const fields: FieldInfo[] = result.fields.map(field => ({
        name: field.name,
        dataType: this.getDataTypeName(field.dataTypeID),
        nullable: true // PostgreSQL doesn't provide this in query results
      }));

      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        fields
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${(error as Error).message}\nSQL: ${sql}`);
    }
  }

  /**
   * Execute an INSERT, UPDATE, or DELETE query
   */
  async execute(sql: string, params: any[] = []): Promise<ExecuteResult> {
    this.ensureConnected();

    try {
      const result = await this.pool!.query(sql, params);
      
      return {
        rowCount: result.rowCount || 0,
        insertId: result.rows[0]?.id // If RETURNING id was used
      };
    } catch (error) {
      throw new Error(`Execute failed: ${(error as Error).message}\nSQL: ${sql}`);
    }
  }

  /**
   * Begin a new transaction
   */
  async beginTransaction(): Promise<Transaction> {
    this.ensureConnected();

    const client = await this.pool!.connect();
    await client.query('BEGIN');

    return new PostgresTransaction(client);
  }

  /**
   * Get table information including columns and indexes
   */
  async getTableInfo(tableName: string): Promise<TableInfo> {
    const [schema, table] = this.parseTableName(tableName);
    const columns = await this.getColumns(tableName);
    const indexes = await this.getIndexes(tableName);
    const primaryKey = columns
      .filter(col => col.isPrimaryKey)
      .map(col => col.name);

    return {
      name: table,
      schema,
      columns,
      primaryKey: primaryKey.length > 0 ? primaryKey : undefined,
      indexes
    };
  }

  /**
   * Get column information for a table
   */
  async getColumns(tableName: string): Promise<ColumnInfo[]> {
    const [schema, table] = this.parseTableName(tableName);

    const sql = `
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        CASE 
          WHEN pk.column_name IS NOT NULL THEN true 
          ELSE false 
        END as is_primary_key,
        CASE 
          WHEN c.column_default LIKE 'nextval%' THEN true 
          ELSE false 
        END as is_auto_increment
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
          AND tc.table_schema = ku.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
      ) pk ON c.column_name = pk.column_name
      WHERE c.table_schema = $1
        AND c.table_name = $2
      ORDER BY c.ordinal_position
    `;

    const result = await this.query<any>(sql, [schema, table]);

    return result.rows.map(row => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      isPrimaryKey: row.is_primary_key,
      isAutoIncrement: row.is_auto_increment,
      maxLength: row.character_maximum_length
    }));
  }

  /**
   * Get indexes for a table
   */
  private async getIndexes(tableName: string): Promise<IndexInfo[]> {
    const [schema, table] = this.parseTableName(tableName);

    const sql = `
      SELECT
        i.relname as index_name,
        array_agg(a.attname ORDER BY x.ord) as column_names,
        ix.indisunique as is_unique,
        ix.indisprimary as is_primary
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS x(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = x.attnum
      WHERE n.nspname = $1
        AND t.relname = $2
      GROUP BY i.relname, ix.indisunique, ix.indisprimary
    `;

    const result = await this.query<any>(sql, [schema, table]);

    return result.rows.map(row => ({
      name: row.index_name,
      columns: this.parsePostgresArray(row.column_names),
      unique: row.is_unique,
      primary: row.is_primary
    }));
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const [schema, table] = this.parseTableName(tableName);

    const sql = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 
          AND table_name = $2
      ) as exists
    `;

    const result = await this.query<{ exists: boolean }>(sql, [schema, table]);
    return result.rows[0]?.exists || false;
  }

  /**
   * Escape identifier for PostgreSQL (double quotes)
   */
  escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /**
   * Format a value for SQL
   */
  formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    if (Array.isArray(value)) {
      return `ARRAY[${value.map(v => this.formatValue(v)).join(',')}]`;
    }
    if (typeof value === 'object') {
      return `'${JSON.stringify(value)}'::jsonb`;
    }
    return String(value);
  }

  /**
   * Convert ? placeholders to $1, $2, etc. for PostgreSQL
   */
  convertPlaceholders(sql: string, params: any[]): PreparedStatement {
    let index = 0;
    const convertedSql = sql.replace(/\?/g, () => `$${++index}`);
    
    return {
      sql: convertedSql,
      params
    };
  }

  /**
   * Ping database to check connection
   */
  async ping(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get PostgreSQL version
   */
  async getVersion(): Promise<string> {
    const result = await this.query<{ version: string }>('SELECT version()');
    return result.rows[0]?.version || 'Unknown';
  }

  /**
   * Get all tables in the database
   */
  async getTables(): Promise<string[]> {
    const sql = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const result = await this.query<{ table_name: string }>(sql);
    return result.rows.map(row => row.table_name);
  }

  /**
   * Truncate a table
   */
  async truncate(tableName: string): Promise<void> {
    const escaped = this.escapeIdentifier(tableName);
    await this.execute(`TRUNCATE TABLE ${escaped} RESTART IDENTITY CASCADE`);
  }

  /**
   * Drop a table
   */
  async dropTable(tableName: string): Promise<void> {
    const escaped = this.escapeIdentifier(tableName);
    await this.execute(`DROP TABLE IF EXISTS ${escaped} CASCADE`);
  }

  /**
   * Ensure connection is established
   */
  private ensureConnected(): void {
    if (!this.connected || !this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }

  /**
   * Parse table name into schema and table
   */
  private parseTableName(tableName: string): [string, string] {
    const parts = tableName.split('.');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return [parts[0], parts[1]];
    }
    return ['public', tableName];
  }

  /**
   * Map PostgreSQL data type ID to name
   */
  private getDataTypeName(dataTypeID: number): string {
    // Common PostgreSQL OID mappings
    const typeMap: { [key: number]: string } = {
      16: 'boolean',
      20: 'bigint',
      21: 'smallint',
      23: 'integer',
      25: 'text',
      700: 'real',
      701: 'double precision',
      1043: 'varchar',
      1082: 'date',
      1114: 'timestamp',
      1184: 'timestamptz',
      2950: 'uuid',
      3802: 'jsonb'
    };

    return typeMap[dataTypeID] || 'unknown';
  }

  /**
   * Parse PostgreSQL array string format {item1,item2} to JavaScript array
   */
  private parsePostgresArray(value: any): string[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      // PostgreSQL returns arrays as {item1,item2,item3}
      const trimmed = value.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const content = trimmed.slice(1, -1);
        if (content === '') {
          return [];
        }
        return content.split(',').map(item => item.trim());
      }
      return [value];
    }
    return [];
  }
}

/**
 * PostgreSQL Transaction implementation
 */
class PostgresTransaction implements Transaction {
  private active: boolean = true;

  constructor(private client: PoolClient) {}

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    this.ensureActive();

    try {
      const result = await this.client.query(sql, params);
      
      const fields: FieldInfo[] = result.fields.map(field => ({
        name: field.name,
        dataType: 'unknown',
        nullable: true
      }));

      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        fields
      };
    } catch (error) {
      throw new Error(`Transaction query failed: ${(error as Error).message}`);
    }
  }

  async execute(sql: string, params: any[] = []): Promise<ExecuteResult> {
    this.ensureActive();

    try {
      const result = await this.client.query(sql, params);
      
      return {
        rowCount: result.rowCount || 0,
        insertId: result.rows[0]?.id
      };
    } catch (error) {
      throw new Error(`Transaction execute failed: ${(error as Error).message}`);
    }
  }

  async commit(): Promise<void> {
    this.ensureActive();

    try {
      await this.client.query('COMMIT');
      this.active = false;
      this.client.release();
    } catch (error) {
      throw new Error(`Transaction commit failed: ${(error as Error).message}`);
    }
  }

  async rollback(): Promise<void> {
    this.ensureActive();

    try {
      await this.client.query('ROLLBACK');
      this.active = false;
      this.client.release();
    } catch (error) {
      throw new Error(`Transaction rollback failed: ${(error as Error).message}`);
    }
  }

  isActive(): boolean {
    return this.active;
  }

  private ensureActive(): void {
    if (!this.active) {
      throw new Error('Transaction is not active');
    }
  }
}
