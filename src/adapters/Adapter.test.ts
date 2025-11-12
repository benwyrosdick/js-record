/**
 * Adapter Tests for js-record
 * Tests both SQLite and PostgreSQL adapters using Bun's test framework
 */

import { describe, beforeEach, afterEach, test, expect } from 'bun:test';

import { SqliteAdapter } from './SqliteAdapter';
import { PostgresAdapter } from './PostgresAdapter';

// Test data
const testUsers = [
  { name: 'Alice Smith', email: 'alice@example.com', age: 30 },
  { name: 'Bob Jones', email: 'bob@example.com', age: 25 },
  { name: 'Charlie Brown', email: 'charlie@example.com', age: 35 },
];

const createUsersTableSQL = `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    age INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`;

const createUsersTablePostgresSQL = `
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    age INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

// SQLite Adapter Tests
describe('SqliteAdapter', () => {
  let adapter: SqliteAdapter;

  beforeEach(async () => {
    adapter = new SqliteAdapter({
      database: ':memory:', // In-memory database for testing
    });
    await adapter.connect();
    await adapter.execute(createUsersTableSQL);
  });

  afterEach(async () => {
    if (adapter.isConnected()) {
      await adapter.disconnect();
    }
  });

  test('should connect and disconnect', async () => {
    expect(adapter.isConnected()).toBe(true);
    await adapter.disconnect();
    expect(adapter.isConnected()).toBe(false);
  });

  test('should check table exists', async () => {
    const exists = await adapter.tableExists('users');
    expect(exists).toBe(true);

    const notExists = await adapter.tableExists('nonexistent');
    expect(notExists).toBe(false);
  });

  test('should get table info', async () => {
    const tableInfo = await adapter.getTableInfo('users');

    expect(tableInfo.name).toBe('users');
    expect(tableInfo.schema).toBe('main');
    expect(tableInfo.columns).toHaveLength(6);
    expect(tableInfo.primaryKey).toEqual(['id']);

    const idColumn = tableInfo.columns.find(col => col.name === 'id');
    expect(idColumn?.isPrimaryKey).toBe(true);
    expect(idColumn?.isAutoIncrement).toBe(true);
  });

  test('should get columns', async () => {
    const columns = await adapter.getColumns('users');

    expect(columns).toHaveLength(6);

    const nameColumn = columns.find(col => col.name === 'name');
    expect(nameColumn?.type).toBe('text');
    expect(nameColumn?.nullable).toBe(false);

    const emailColumn = columns.find(col => col.name === 'email');
    expect(emailColumn?.type).toBe('text');
    expect(emailColumn?.nullable).toBe(false);
  });

  test('should insert data', async () => {
    const result = await adapter.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      testUsers[0].name,
      testUsers[0].email,
      testUsers[0].age,
    ]);

    expect(result.rowCount).toBe(1);
    expect(result.insertId).toBe(1);
  });

  test('should query data', async () => {
    // Insert test data
    for (const user of testUsers) {
      await adapter.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
        user.name,
        user.email,
        user.age,
      ]);
    }

    const result = await adapter.query('SELECT * FROM users ORDER BY id');

    expect(result.rowCount).toBe(3);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toMatchObject(testUsers[0]);
  });

  test('should handle parameterized queries', async () => {
    // Insert test data
    await adapter.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      testUsers[0].name,
      testUsers[0].email,
      testUsers[0].age,
    ]);

    const result = await adapter.query('SELECT * FROM users WHERE age > ? AND name = ?', [
      25,
      testUsers[0].name,
    ]);

    expect(result.rowCount).toBe(1);
    expect(result.rows[0]).toMatchObject(testUsers[0]);
  });

  test('should update data', async () => {
    // Insert test data
    await adapter.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      testUsers[0].name,
      testUsers[0].email,
      testUsers[0].age,
    ]);

    const result = await adapter.execute('UPDATE users SET age = ? WHERE name = ?', [
      31,
      testUsers[0].name,
    ]);

    expect(result.rowCount).toBe(1);

    const updated = await adapter.query('SELECT age FROM users WHERE name = ?', [
      testUsers[0].name,
    ]);
    expect(updated.rows[0].age).toBe(31);
  });

  test('should delete data', async () => {
    // Insert test data
    await adapter.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      testUsers[0].name,
      testUsers[0].email,
      testUsers[0].age,
    ]);

    const result = await adapter.execute('DELETE FROM users WHERE name = ?', [testUsers[0].name]);
    expect(result.rowCount).toBe(1);

    const deleted = await adapter.query('SELECT * FROM users WHERE name = ?', [testUsers[0].name]);
    expect(deleted.rowCount).toBe(0);
  });

  test('should handle transactions', async () => {
    const tx = await adapter.beginTransaction();

    try {
      await tx.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
        testUsers[0].name,
        testUsers[0].email,
        testUsers[0].age,
      ]);

      await tx.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
        testUsers[1].name,
        testUsers[1].email,
        testUsers[1].age,
      ]);

      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }

    const result = await adapter.query('SELECT COUNT(*) as count FROM users');
    expect(result.rows[0].count).toBe(2);
  });

  test('should rollback transactions', async () => {
    const tx = await adapter.beginTransaction();

    try {
      await tx.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
        testUsers[0].name,
        testUsers[0].email,
        testUsers[0].age,
      ]);

      await tx.rollback();
    } catch (error) {
      await tx.rollback();
      throw error;
    }

    const result = await adapter.query('SELECT COUNT(*) as count FROM users');
    expect(result.rows[0].count).toBe(0);
  });

  test('should get all tables', async () => {
    const tables = await adapter.getTables();
    expect(tables).toContain('users');
  });

  test('should get version', async () => {
    const version = await adapter.getVersion();
    expect(typeof version).toBe('string');
    expect(version.length).toBeGreaterThan(0);
  });

  test('should ping database', async () => {
    const isAlive = await adapter.ping();
    expect(isAlive).toBe(true);
  });

  test('should truncate table', async () => {
    // Insert test data
    await adapter.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      testUsers[0].name,
      testUsers[0].email,
      testUsers[0].age,
    ]);

    await adapter.truncate('users');

    const result = await adapter.query('SELECT COUNT(*) as count FROM users');
    expect(result.rows[0].count).toBe(0);
  });

  test('should drop table', async () => {
    await adapter.dropTable('users');
    const exists = await adapter.tableExists('users');
    expect(exists).toBe(false);
  });

  test('should escape identifiers', () => {
    expect(adapter.escapeIdentifier('users')).toBe('"users"');
    expect(adapter.escapeIdentifier('user"table')).toBe('"user""table"');
  });

  test('should format values', () => {
    expect(adapter.formatValue(null)).toBe('NULL');
    expect(adapter.formatValue(undefined)).toBe('NULL');
    expect(adapter.formatValue('hello')).toBe("'hello'");
    expect(adapter.formatValue("it's")).toBe("'it''s'");
    expect(adapter.formatValue(true)).toBe('1');
    expect(adapter.formatValue(false)).toBe('0');
    expect(adapter.formatValue(42)).toBe('42');
    expect(adapter.formatValue(new Date('2023-01-01'))).toBe("'2023-01-01T00:00:00.000Z'");
    expect(adapter.formatValue([1, 2, 3])).toBe("'[1,2,3]'");
    expect(adapter.formatValue({ a: 1 })).toBe('\'{"a":1}\'');
  });

  test('should convert placeholders', () => {
    const result = adapter.convertPlaceholders('SELECT * FROM users WHERE id = $1 AND name = $2', [
      1,
      'test',
    ]);
    expect(result.sql).toBe('SELECT * FROM users WHERE id = ? AND name = ?');
    expect(result.params).toEqual([1, 'test']);
  });
});

// PostgreSQL Adapter Tests
describe('PostgresAdapter', () => {
  let adapter: PostgresAdapter;

  // Skip PostgreSQL tests if no connection string is provided
  const skipPostgres = !process.env.POSTGRES_CONNECTION_STRING;

  beforeEach(async () => {
    if (skipPostgres) return;

    adapter = new PostgresAdapter({
      database: 'test',
      connectionString: process.env.POSTGRES_CONNECTION_STRING!,
    });
    await adapter.connect();

    // Clean up any existing test table
    try {
      await adapter.dropTable('users');
    } catch {
      // Ignore if table doesn't exist
    }

    await adapter.execute(createUsersTablePostgresSQL);
  });

  afterEach(async () => {
    if (skipPostgres || !adapter) return;

    if (adapter.isConnected()) {
      try {
        await adapter.dropTable('users');
      } catch {
        // Ignore cleanup errors
      }
      await adapter.disconnect();
    }
  });

  test.skip('skip postgres tests if no connection string', () => {
    if (skipPostgres) {
      console.log(
        '⚠️  PostgreSQL tests skipped. Set POSTGRES_CONNECTION_STRING environment variable to run.'
      );
    }
  });

  test('should connect and disconnect', async () => {
    if (skipPostgres) return;

    expect(adapter.isConnected()).toBe(true);
    await adapter.disconnect();
    expect(adapter.isConnected()).toBe(false);
  });

  test('should check table exists', async () => {
    if (skipPostgres) return;

    const exists = await adapter.tableExists('users');
    expect(exists).toBe(true);

    const notExists = await adapter.tableExists('nonexistent');
    expect(notExists).toBe(false);
  });

  test('should get table info', async () => {
    if (skipPostgres) return;

    const tableInfo = await adapter.getTableInfo('users');

    expect(tableInfo.name).toBe('users');
    expect(tableInfo.schema).toBe('public');
    expect(tableInfo.columns.length).toBeGreaterThan(0);
    expect(tableInfo.primaryKey).toEqual(['id']);

    const idColumn = tableInfo.columns.find(col => col.name === 'id');
    expect(idColumn?.isPrimaryKey).toBe(true);
    expect(idColumn?.isAutoIncrement).toBe(true);
  });

  test('should insert data', async () => {
    if (skipPostgres) return;

    const result = await adapter.execute(
      'INSERT INTO users (name, email, age) VALUES ($1, $2, $3)',
      [testUsers[0].name, testUsers[0].email, testUsers[0].age]
    );

    expect(result.rowCount).toBe(1);
    expect(result.insertId).toBeDefined();
  });

  test('should query data', async () => {
    if (skipPostgres) return;

    // Insert test data
    for (const user of testUsers) {
      await adapter.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
        user.name,
        user.email,
        user.age,
      ]);
    }

    const result = await adapter.query('SELECT * FROM users ORDER BY id');

    expect(result.rowCount).toBe(3);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toMatchObject({
      name: testUsers[0].name,
      email: testUsers[0].email,
      age: testUsers[0].age,
    });
  });

  test('should handle transactions', async () => {
    if (skipPostgres) return;

    const tx = await adapter.beginTransaction();

    try {
      await tx.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
        testUsers[0].name,
        testUsers[0].email,
        testUsers[0].age,
      ]);

      await tx.execute('INSERT INTO users (name, email, age) VALUES ($1, $2, $3)', [
        testUsers[1].name,
        testUsers[1].email,
        testUsers[1].age,
      ]);

      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }

    const result = await adapter.query('SELECT COUNT(*) as count FROM users');
    expect(result.rows[0].count).toBe(2);
  });

  test('should escape identifiers', () => {
    if (skipPostgres) return;

    expect(adapter.escapeIdentifier('users')).toBe('"users"');
    expect(adapter.escapeIdentifier('user"table')).toBe('"user""table"');
  });

  test('should format values', () => {
    if (skipPostgres) return;

    expect(adapter.formatValue(null)).toBe('NULL');
    expect(adapter.formatValue(undefined)).toBe('NULL');
    expect(adapter.formatValue('hello')).toBe("'hello'");
    expect(adapter.formatValue("it's")).toBe("'it''s'");
    expect(adapter.formatValue(true)).toBe('TRUE');
    expect(adapter.formatValue(false)).toBe('FALSE');
    expect(adapter.formatValue(42)).toBe('42');
    expect(adapter.formatValue(new Date('2023-01-01'))).toBe("'2023-01-01T00:00:00.000Z'");
    expect(adapter.formatValue([1, 2, 3])).toBe('ARRAY[1,2,3]');
    expect(adapter.formatValue({ a: 1 })).toBe('\'{"a":1}\'::jsonb');
  });

  test('should convert placeholders', () => {
    if (skipPostgres) return;

    const result = adapter.convertPlaceholders('SELECT * FROM users WHERE id = ? AND name = ?', [
      1,
      'test',
    ]);
    expect(result.sql).toBe('SELECT * FROM users WHERE id = $1 AND name = $2');
    expect(result.params).toEqual([1, 'test']);
  });

  test('should get version', async () => {
    if (skipPostgres) return;

    const version = await adapter.getVersion();
    expect(typeof version).toBe('string');
    expect(version.length).toBeGreaterThan(0);
    expect(version.toLowerCase()).toContain('postgresql');
  });

  test('should get all tables', async () => {
    if (skipPostgres) return;

    const tables = await adapter.getTables();
    expect(tables).toContain('users');
  });

  test('should ping database', async () => {
    if (skipPostgres) return;

    const isAlive = await adapter.ping();
    expect(isAlive).toBe(true);
  });
});

// Base Adapter Interface Tests
describe('DatabaseAdapter Interface', () => {
  test('SqliteAdapter implements all required methods', async () => {
    const adapter = new SqliteAdapter({ database: ':memory:' });
    await adapter.connect();

    // Test that all required methods exist
    expect(typeof adapter.connect).toBe('function');
    expect(typeof adapter.disconnect).toBe('function');
    expect(typeof adapter.query).toBe('function');
    expect(typeof adapter.execute).toBe('function');
    expect(typeof adapter.beginTransaction).toBe('function');
    expect(typeof adapter.getTableInfo).toBe('function');
    expect(typeof adapter.getColumns).toBe('function');
    expect(typeof adapter.tableExists).toBe('function');
    expect(typeof adapter.escapeIdentifier).toBe('function');
    expect(typeof adapter.formatValue).toBe('function');
    expect(typeof adapter.convertPlaceholders).toBe('function');
    expect(typeof adapter.ping).toBe('function');
    expect(typeof adapter.getVersion).toBe('function');
    expect(typeof adapter.getTables).toBe('function');
    expect(typeof adapter.truncate).toBe('function');
    expect(typeof adapter.dropTable).toBe('function');
    expect(typeof adapter.raw).toBe('function');
    expect(typeof adapter.getDatabaseName).toBe('function');
    expect(typeof adapter.isConnected).toBe('function');

    await adapter.disconnect();
  });

  test('PostgresAdapter implements all required methods', () => {
    const adapter = new PostgresAdapter({
      database: 'test',
      connectionString: 'postgresql://test:test@localhost/test',
    });

    // Test that all required methods exist
    expect(typeof adapter.connect).toBe('function');
    expect(typeof adapter.disconnect).toBe('function');
    expect(typeof adapter.query).toBe('function');
    expect(typeof adapter.execute).toBe('function');
    expect(typeof adapter.beginTransaction).toBe('function');
    expect(typeof adapter.getTableInfo).toBe('function');
    expect(typeof adapter.getColumns).toBe('function');
    expect(typeof adapter.tableExists).toBe('function');
    expect(typeof adapter.escapeIdentifier).toBe('function');
    expect(typeof adapter.formatValue).toBe('function');
    expect(typeof adapter.convertPlaceholders).toBe('function');
    expect(typeof adapter.ping).toBe('function');
    expect(typeof adapter.getVersion).toBe('function');
    expect(typeof adapter.getTables).toBe('function');
    expect(typeof adapter.truncate).toBe('function');
    expect(typeof adapter.dropTable).toBe('function');
    expect(typeof adapter.raw).toBe('function');
    expect(typeof adapter.getDatabaseName).toBe('function');
    expect(typeof adapter.isConnected).toBe('function');
  });
});

// Error Handling Tests
describe('Adapter Error Handling', () => {
  test('SqliteAdapter handles connection errors', async () => {
    const adapter = new SqliteAdapter({ database: '/invalid/path/test.db' });

    await expect(adapter.connect()).rejects.toThrow();
    expect(adapter.isConnected()).toBe(false);
  });

  test('SqliteAdapter handles query errors', async () => {
    const adapter = new SqliteAdapter({ database: ':memory:' });
    await adapter.connect();

    await expect(adapter.query('SELECT * FROM nonexistent')).rejects.toThrow();

    await adapter.disconnect();
  });

  test('SqliteAdapter handles execute errors', async () => {
    const adapter = new SqliteAdapter({ database: ':memory:' });
    await adapter.connect();

    await expect(adapter.execute('INSERT INTO nonexistent (col) VALUES (1)')).rejects.toThrow();

    await adapter.disconnect();
  });

  test('PostgresAdapter handles connection errors', async () => {
    const adapter = new PostgresAdapter({
      database: 'test',
      connectionString: 'postgresql://invalid:invalid@localhost:9999/invalid',
    });

    await expect(adapter.connect()).rejects.toThrow();
    expect(adapter.isConnected()).toBe(false);
  });
});

// Performance and Edge Cases
describe('Adapter Edge Cases', () => {
  test('SqliteAdapter handles empty results', async () => {
    const adapter = new SqliteAdapter({ database: ':memory:' });
    await adapter.connect();

    const result = await adapter.query('SELECT 1 WHERE 1 = 0');

    expect(result.rowCount).toBe(0);
    expect(result.rows).toHaveLength(0);
    expect(result.fields).toHaveLength(0);

    await adapter.disconnect();
  });

  test('SqliteAdapter handles large datasets', async () => {
    const adapter = new SqliteAdapter({ database: ':memory:' });
    await adapter.connect();

    await adapter.execute(createUsersTableSQL);

    // Insert many records
    const insertPromises = [];
    for (let i = 0; i < 100; i++) {
      insertPromises.push(
        // @ts-expect-error - SQLite adapter uses ? placeholders
        adapter.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
          `User ${i}`,
          `user${i}@example.com`,
          i,
        ])
      );
    }

    await Promise.all(insertPromises);

    const result = await adapter.query('SELECT COUNT(*) as count FROM users');
    expect(result.rows[0].count).toBe(100);

    await adapter.disconnect();
  });

  test('Adapters handle special characters in data', async () => {
    const adapter = new SqliteAdapter({ database: ':memory:' });
    await adapter.connect();

    await adapter.execute(createUsersTableSQL);

    const specialData = {
      name: "John O'Connor",
      email: 'test+tag@example.com',
      age: 30,
    };

    await adapter.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      specialData.name,
      specialData.email,
      specialData.age,
    ]);

    const result = await adapter.query('SELECT * FROM users WHERE name = ?', [specialData.name]);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0]).toMatchObject(specialData);

    await adapter.disconnect();
  });
});
