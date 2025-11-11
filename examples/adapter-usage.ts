/**
 * Example: Using the PostgreSQL Adapter
 * 
 * This demonstrates how to use the PostgresAdapter directly
 * for database operations.
 */

import { PostgresAdapter, ConnectionConfig } from '../src/adapters';

async function main() {
  // Create adapter instance with connection config
  const config: ConnectionConfig = {
    host: 'localhost',
    port: 5432,
    database: 'myapp_development',
    user: 'postgres',
    password: 'password',
    poolSize: 10
  };

  // Or use connection string
  const configWithConnectionString: ConnectionConfig = {
    database: 'myapp_development',
    connectionString: 'postgresql://postgres:password@localhost:5432/myapp_development'
  };

  const adapter = new PostgresAdapter(config);

  try {
    // Connect to database
    await adapter.connect();
    console.log('Connected to PostgreSQL');

    // Check connection
    const isAlive = await adapter.ping();
    console.log('Connection alive:', isAlive);

    // Get database version
    const version = await adapter.getVersion();
    console.log('PostgreSQL version:', version);

    // List all tables
    const tables = await adapter.getTables();
    console.log('Tables:', tables);

    // Check if a table exists
    const exists = await adapter.tableExists('users');
    console.log('Users table exists:', exists);

    // Execute a query
    const result = await adapter.query('SELECT * FROM users WHERE active = $1', [true]);
    console.log('Active users:', result.rows);

    // Execute an insert with RETURNING
    const insertResult = await adapter.execute(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id',
      ['John Doe', 'john@example.com']
    );
    console.log('Inserted user ID:', insertResult.insertId);

    // Get table information
    if (exists) {
      const tableInfo = await adapter.getTableInfo('users');
      console.log('Users table schema:', tableInfo);
      console.log('Columns:', tableInfo.columns);
      console.log('Indexes:', tableInfo.indexes);
    }

    // Using transactions
    const transaction = await adapter.beginTransaction();
    try {
      await transaction.execute(
        'INSERT INTO users (name, email) VALUES ($1, $2)',
        ['Jane Doe', 'jane@example.com']
      );
      await transaction.execute(
        'INSERT INTO profiles (user_id, bio) VALUES ($1, $2)',
        [1, 'Software developer']
      );
      await transaction.commit();
      console.log('Transaction committed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Transaction rolled back:', error);
    }

    // Using placeholder conversion
    const prepared = adapter.convertPlaceholders(
      'SELECT * FROM users WHERE name = ? AND age > ?',
      ['John', 18]
    );
    console.log('Converted SQL:', prepared.sql);
    // Output: SELECT * FROM users WHERE name = $1 AND age > $2

    // Identifier escaping
    const escapedTable = adapter.escapeIdentifier('my-table');
    console.log('Escaped identifier:', escapedTable);
    // Output: "my-table"

    // Value formatting
    const formattedValue = adapter.formatValue(new Date());
    console.log('Formatted date:', formattedValue);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Always disconnect when done
    await adapter.disconnect();
    console.log('Disconnected from PostgreSQL');
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}
