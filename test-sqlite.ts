/**
 * SQLite Adapter Test
 * Tests the SQLite adapter with Bun's native SQLite support
 */

import { SqliteAdapter } from './src/adapters';

async function testSqliteAdapter() {
  console.log('🧪 Testing SQLite Adapter with Bun...\n');

  // Test 1: Connection
  console.log('Test 1: Creating SQLite database connection...');
  const adapter = new SqliteAdapter({
    database: ':memory:', // In-memory database for testing
  });

  try {
    await adapter.connect();
    console.log('✅ Connected to SQLite (in-memory)\n');
  } catch (error) {
    console.error('❌ Connection failed:', error);
    return;
  }

  // Test 2: Create table
  console.log('Test 2: Creating users table...');
  try {
    await adapter.execute(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        age INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table created successfully\n');
  } catch (error) {
    console.error('❌ Create table failed:', error);
  }

  // Test 3: Table exists check
  console.log('Test 3: Checking if table exists...');
  try {
    const exists = await adapter.tableExists('users');
    console.log(`✅ Table exists: ${exists}\n`);
  } catch (error) {
    console.error('❌ Table exists check failed:', error);
  }

  // Test 4: Get table info
  console.log('Test 4: Getting table information...');
  try {
    const tableInfo = await adapter.getTableInfo('users');
    console.log('✅ Table info:', JSON.stringify(tableInfo, null, 2), '\n');
  } catch (error) {
    console.error('❌ Get table info failed:', error);
  }

  // Test 5: Insert data
  console.log('Test 5: Inserting test data...');
  try {
    const result1 = await adapter.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      'Alice Smith',
      'alice@example.com',
      30,
    ]);
    console.log(`✅ Inserted row with ID: ${result1.insertId}`);

    const result2 = await adapter.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      'Bob Jones',
      'bob@example.com',
      25,
    ]);
    console.log(`✅ Inserted row with ID: ${result2.insertId}`);

    const result3 = await adapter.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      'Charlie Brown',
      'charlie@example.com',
      35,
    ]);
    console.log(`✅ Inserted row with ID: ${result3.insertId}\n`);
  } catch (error) {
    console.error('❌ Insert failed:', error);
  }

  // Test 6: Query data
  console.log('Test 6: Querying all users...');
  try {
    const result = await adapter.query('SELECT * FROM users ORDER BY id');
    console.log(`✅ Found ${result.rowCount} users:`);
    result.rows.forEach((user: any) => {
      console.log(`   - ${user.name} (${user.email}), age: ${user.age}`);
    });
    console.log();
  } catch (error) {
    console.error('❌ Query failed:', error);
  }

  // Test 7: Parameterized query
  console.log('Test 7: Parameterized query (age > 28)...');
  try {
    const result = await adapter.query('SELECT * FROM users WHERE age > ? ORDER BY age', [28]);
    console.log(`✅ Found ${result.rowCount} users:`);
    result.rows.forEach((user: any) => {
      console.log(`   - ${user.name}, age: ${user.age}`);
    });
    console.log();
  } catch (error) {
    console.error('❌ Parameterized query failed:', error);
  }

  // Test 8: Update data
  console.log('Test 8: Updating user data...');
  try {
    const result = await adapter.execute('UPDATE users SET age = ? WHERE name = ?', [
      31,
      'Alice Smith',
    ]);
    console.log(`✅ Updated ${result.rowCount} row(s)\n`);
  } catch (error) {
    console.error('❌ Update failed:', error);
  }

  // Test 9: Transactions
  console.log('Test 9: Testing transactions...');
  try {
    const tx = await adapter.beginTransaction();

    await tx.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      'Dave Wilson',
      'dave@example.com',
      40,
    ]);

    await tx.execute('UPDATE users SET is_active = ? WHERE name = ?', [0, 'Bob Jones']);

    await tx.commit();
    console.log('✅ Transaction committed successfully\n');
  } catch (error) {
    console.error('❌ Transaction failed:', error);
  }

  // Test 10: Rollback transaction
  console.log('Test 10: Testing transaction rollback...');
  try {
    const tx = await adapter.beginTransaction();

    await tx.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
      'Eve Davis',
      'eve@example.com',
      28,
    ]);

    // Rollback instead of commit
    await tx.rollback();
    console.log('✅ Transaction rolled back successfully');

    const result = await adapter.query('SELECT * FROM users WHERE email = ?', ['eve@example.com']);
    console.log(`✅ User count after rollback: ${result.rowCount} (should be 0)\n`);
  } catch (error) {
    console.error('❌ Rollback test failed:', error);
  }

  // Test 11: Get all tables
  console.log('Test 11: Getting all tables...');
  try {
    const tables = await adapter.getTables();
    console.log('✅ Tables:', tables, '\n');
  } catch (error) {
    console.error('❌ Get tables failed:', error);
  }

  // Test 12: SQLite version
  console.log('Test 12: Getting SQLite version...');
  try {
    const version = await adapter.getVersion();
    console.log(`✅ SQLite version: ${version}\n`);
  } catch (error) {
    console.error('❌ Get version failed:', error);
  }

  // Test 13: Ping
  console.log('Test 13: Ping database...');
  try {
    const isAlive = await adapter.ping();
    console.log(`✅ Database ping: ${isAlive ? 'alive' : 'dead'}\n`);
  } catch (error) {
    console.error('❌ Ping failed:', error);
  }

  // Test 14: Truncate table
  console.log('Test 14: Truncating table...');
  try {
    await adapter.truncate('users');
    const result = await adapter.query('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Table truncated. Row count: ${(result.rows[0] as any).count}\n`);
  } catch (error) {
    console.error('❌ Truncate failed:', error);
  }

  // Clean up
  console.log('Cleaning up...');
  try {
    await adapter.dropTable('users');
    await adapter.disconnect();
    console.log('✅ Disconnected from SQLite\n');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }

  console.log('🎉 All tests completed!');
}

// Run tests
testSqliteAdapter().catch(console.error);
