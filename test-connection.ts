/**
 * Test script to verify PostgreSQL adapter connection
 * 
 * Usage:
 *   ts-node test-connection.ts
 * 
 * Or set environment variables:
 *   DB_HOST=localhost DB_PORT=5432 DB_NAME=test DB_USER=postgres DB_PASSWORD=password ts-node test-connection.ts
 */

import { PostgresAdapter } from './src/adapters';

async function testConnection() {
  console.log('🔌 Testing PostgreSQL Adapter Connection...\n');

  // Get configuration from environment variables or use defaults
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'js_record_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };

  console.log('📋 Configuration:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Password: ${'*'.repeat(config.password.length)}\n`);

  const adapter = new PostgresAdapter(config);

  try {
    // Test 1: Connect
    console.log('1️⃣  Testing connection...');
    await adapter.connect();
    console.log('   ✅ Connected successfully!\n');

    // Test 2: Ping
    console.log('2️⃣  Testing ping...');
    const isAlive = await adapter.ping();
    console.log(`   ✅ Ping successful: ${isAlive}\n`);

    // Test 3: Get version
    console.log('3️⃣  Getting PostgreSQL version...');
    const version = await adapter.getVersion();
    console.log(`   ✅ Version: ${version}\n`);

    // Test 4: Get database name
    console.log('4️⃣  Getting database name...');
    const dbName = adapter.getDatabaseName();
    console.log(`   ✅ Database: ${dbName}\n`);

    // Test 5: List all tables
    console.log('5️⃣  Listing all tables...');
    const tables = await adapter.getTables();
    if (tables.length > 0) {
      console.log(`   ✅ Found ${tables.length} table(s):`);
      tables.forEach(table => console.log(`      - ${table}`));
    } else {
      console.log('   ℹ️  No tables found in database');
    }
    console.log();

    // Test 6: Create a test table
    console.log('6️⃣  Creating test table...');
    await adapter.execute(`
      CREATE TABLE IF NOT EXISTS test_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        age INTEGER,
        active BOOLEAN DEFAULT true,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Table created successfully!\n');

    // Test 7: Check if table exists
    console.log('7️⃣  Checking if test_users table exists...');
    const exists = await adapter.tableExists('test_users');
    console.log(`   ✅ Table exists: ${exists}\n`);

    // Test 8: Get table info
    console.log('8️⃣  Getting table information...');
    const tableInfo = await adapter.getTableInfo('test_users');
    console.log(`   ✅ Table: ${tableInfo.name}`);
    console.log(`   Schema: ${tableInfo.schema}`);
    console.log(`   Primary Key: ${tableInfo.primaryKey?.join(', ')}`);
    console.log(`   Columns (${tableInfo.columns.length}):`);
    tableInfo.columns.forEach(col => {
      console.log(`      - ${col.name}: ${col.type}${col.nullable ? ' (nullable)' : ' (required)'}${col.isPrimaryKey ? ' [PK]' : ''}`);
    });
    console.log(`   Indexes (${tableInfo.indexes.length}):`);
    tableInfo.indexes.forEach(idx => {
      console.log(`      - ${idx.name}: ${idx.columns.join(', ')}${idx.unique ? ' [UNIQUE]' : ''}${idx.primary ? ' [PRIMARY]' : ''}`);
    });
    console.log();

    // Test 9: Insert data
    console.log('9️⃣  Inserting test data...');
    const insertResult = await adapter.execute(
      `INSERT INTO test_users (name, email, age, metadata) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['John Doe', 'john@example.com', 30, JSON.stringify({ role: 'admin' })]
    );
    console.log(`   ✅ Inserted record with ID: ${insertResult.insertId}\n`);

    // Test 10: Query data
    console.log('🔟 Querying test data...');
    const queryResult = await adapter.query(
      'SELECT * FROM test_users WHERE email = $1',
      ['john@example.com']
    );
    console.log(`   ✅ Found ${queryResult.rowCount} record(s):`);
    queryResult.rows.forEach(row => {
      console.log(`      ${JSON.stringify(row, null, 2)}`);
    });
    console.log();

    // Test 11: Update data
    console.log('1️⃣1️⃣  Updating test data...');
    const updateResult = await adapter.execute(
      'UPDATE test_users SET age = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      [31, 'john@example.com']
    );
    console.log(`   ✅ Updated ${updateResult.rowCount} record(s)\n`);

    // Test 12: Transaction test
    console.log('1️⃣2️⃣  Testing transaction...');
    const transaction = await adapter.beginTransaction();
    try {
      await transaction.execute(
        'INSERT INTO test_users (name, email, age) VALUES ($1, $2, $3)',
        ['Jane Doe', 'jane@example.com', 25]
      );
      await transaction.execute(
        'INSERT INTO test_users (name, email, age) VALUES ($1, $2, $3)',
        ['Bob Smith', 'bob@example.com', 35]
      );
      await transaction.commit();
      console.log('   ✅ Transaction committed successfully!\n');
    } catch (error) {
      await transaction.rollback();
      console.log('   ❌ Transaction rolled back:', error);
    }

    // Test 13: Count records
    console.log('1️⃣3️⃣  Counting total records...');
    const countResult = await adapter.query('SELECT COUNT(*) as count FROM test_users');
    console.log(`   ✅ Total records: ${countResult.rows[0]?.count}\n`);

    // Test 14: Placeholder conversion
    console.log('1️⃣4️⃣  Testing placeholder conversion...');
    const prepared = adapter.convertPlaceholders(
      'SELECT * FROM test_users WHERE name = ? AND age > ?',
      ['John', 18]
    );
    console.log(`   Original: SELECT * FROM test_users WHERE name = ? AND age > ?`);
    console.log(`   Converted: ${prepared.sql}`);
    console.log(`   Params: ${JSON.stringify(prepared.params)}\n`);

    // Test 15: Identifier escaping
    console.log('1️⃣5️⃣  Testing identifier escaping...');
    const escaped = adapter.escapeIdentifier('my-special-table');
    console.log(`   Original: my-special-table`);
    console.log(`   Escaped: ${escaped}\n`);

    // Test 16: Cleanup
    console.log('1️⃣6️⃣  Cleaning up test table...');
    await adapter.dropTable('test_users');
    console.log('   ✅ Test table dropped\n');

    console.log('✨ All tests passed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    // Always disconnect
    await adapter.disconnect();
    console.log('\n👋 Disconnected from database');
  }
}

// Run tests
testConnection().catch(console.error);
