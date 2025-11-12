/**
 * Multi-Adapter Usage Example
 * Demonstrates how to switch between PostgreSQL and SQLite
 * using the same Model code
 */

import { PostgresAdapter, SqliteAdapter } from '../src/adapters';
import { Model } from '../src/core';

// Define User model (works with any adapter)
class User extends Model {
  static tableName = 'users';

  id!: number;
  name!: string;
  email!: string;
  age?: number;
  createdAt?: Date;
}

// Example 1: Using SQLite for Development/Testing
console.log('📚 Example 1: SQLite (Development/Testing)\n');

async function useSqlite() {
  const adapter = new SqliteAdapter({
    database: ':memory:', // In-memory for testing
  });

  await adapter.connect();
  Model.setAdapter(adapter);

  // Create table (in production, use migrations)
  await adapter.execute(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      age INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Connected to SQLite (in-memory)');

  // Create users
  const user1 = await User.create({
    name: 'Alice Johnson',
    email: 'alice@example.com',
    age: 28,
  });
  console.log('✅ Created user:', user1.id, user1.name);

  const user2 = await User.create({
    name: 'Bob Smith',
    email: 'bob@example.com',
    age: 35,
  });
  console.log('✅ Created user:', user2.id, user2.name);

  // Query users
  const users = await User.all();
  console.log(`✅ Found ${users.length} users in SQLite\n`);

  await adapter.disconnect();
}

// Example 2: Using PostgreSQL for Production
console.log('📊 Example 2: PostgreSQL (Production)\n');

async function usePostgres() {
  // Note: This requires a running PostgreSQL instance
  // Uncomment and configure if you have PostgreSQL available

  /*
  const adapter = new PostgresAdapter({
    host: 'localhost',
    port: 5432,
    database: 'myapp_dev',
    user: 'postgres',
    password: 'password',
  });

  await adapter.connect();
  Model.setAdapter(adapter);

  console.log('✅ Connected to PostgreSQL');

  // Same Model code works!
  const user1 = await User.create({
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    age: 42,
  });
  console.log('✅ Created user:', user1.id, user1.name);

  const users = await User.all();
  console.log(`✅ Found ${users.length} users in PostgreSQL\n`);

  await adapter.disconnect();
  */

  console.log('⚠️  PostgreSQL example skipped (requires running server)\n');
}

// Example 3: Environment-Based Adapter Selection
console.log('🔄 Example 3: Environment-Based Selection\n');

async function selectAdapterByEnvironment() {
  const env = process.env.NODE_ENV || 'development';
  let adapter: PostgresAdapter | SqliteAdapter;

  switch (env) {
    case 'test':
      console.log('Using SQLite in-memory for testing');
      adapter = new SqliteAdapter({ database: ':memory:' });
      break;

    case 'development':
      console.log('Using SQLite file for development');
      adapter = new SqliteAdapter({ database: './dev.db' });
      break;

    case 'production':
      console.log('Using PostgreSQL for production');
      adapter = new PostgresAdapter({
        database: process.env.DATABASE_NAME || 'myapp_production',
        connectionString: process.env.DATABASE_URL,
      });
      break;

    default:
      throw new Error(`Unknown environment: ${env}`);
  }

  await adapter.connect();
  Model.setAdapter(adapter);

  console.log(`✅ Connected to database for ${env} environment\n`);

  await adapter.disconnect();
}

// Example 4: Adapter-Specific Features
console.log('⚙️  Example 4: Adapter-Specific Features\n');

async function adapterSpecificFeatures() {
  const adapter = new SqliteAdapter({ database: ':memory:' });
  await adapter.connect();

  // SQLite-specific PRAGMA commands
  await adapter.execute('PRAGMA journal_mode = WAL');
  await adapter.execute('PRAGMA synchronous = NORMAL');
  await adapter.execute('PRAGMA cache_size = 10000');

  console.log('✅ SQLite PRAGMA settings applied');

  const version = await adapter.getVersion();
  console.log(`✅ SQLite version: ${version}\n`);

  await adapter.disconnect();
}

// Example 5: Testing with Different Adapters
console.log('🧪 Example 5: Testing with Different Adapters\n');

async function testWithBothAdapters() {
  // Test the same logic with both adapters
  async function testUserCreation(adapter: PostgresAdapter | SqliteAdapter) {
    await adapter.connect();
    Model.setAdapter(adapter);

    // Create schema based on adapter type
    if (adapter instanceof SqliteAdapter) {
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          age INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    // PostgreSQL schema would be created via migrations

    // Test logic (same for both adapters)
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      age: 30,
    });

    const found = await User.find(user.id);
    const isEqual = found?.email === user.email;

    await adapter.disconnect();
    return isEqual;
  }

  // Test with SQLite
  const sqliteAdapter = new SqliteAdapter({ database: ':memory:' });
  const sqliteResult = await testUserCreation(sqliteAdapter);
  console.log(`✅ SQLite test: ${sqliteResult ? 'PASSED' : 'FAILED'}`);

  // Test with PostgreSQL would work the same way
  console.log('⚠️  PostgreSQL test skipped (requires running server)\n');
}

// Example 6: Migration Between Adapters
console.log('🔀 Example 6: Migrating Data Between Adapters\n');

async function migrateData() {
  // Source: SQLite
  const sqliteAdapter = new SqliteAdapter({ database: './source.db' });
  await sqliteAdapter.connect();

  await sqliteAdapter.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT
    )
  `);

  await sqliteAdapter.execute('INSERT INTO users (name, email) VALUES (?, ?)', [
    'Migration Test',
    'migrate@example.com',
  ]);

  // Read from SQLite
  const sourceData = await sqliteAdapter.query('SELECT * FROM users');
  console.log(`✅ Read ${sourceData.rowCount} rows from SQLite`);

  // Destination: Another SQLite (could be PostgreSQL)
  const destAdapter = new SqliteAdapter({ database: ':memory:' });
  await destAdapter.connect();

  await destAdapter.execute(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT
    )
  `);

  // Write to destination
  const tx = await destAdapter.beginTransaction();
  try {
    for (const row of sourceData.rows) {
      await tx.execute('INSERT INTO users (name, email) VALUES (?, ?)', [
        (row as any).name,
        (row as any).email,
      ]);
    }
    await tx.commit();
    console.log(`✅ Migrated ${sourceData.rowCount} rows to destination\n`);
  } catch (error) {
    await tx.rollback();
    throw error;
  }

  await sqliteAdapter.disconnect();
  await destAdapter.disconnect();
}

// Run all examples
async function runExamples() {
  try {
    await useSqlite();
    await usePostgres();
    await selectAdapterByEnvironment();
    await adapterSpecificFeatures();
    await testWithBothAdapters();
    await migrateData();

    console.log('🎉 All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

runExamples();

/**
 * Key Takeaways:
 *
 * 1. Same Model Code Works Everywhere
 *    - Write your models once
 *    - Switch adapters by changing configuration
 *    - Perfect for testing with SQLite, deploying with PostgreSQL
 *
 * 2. Choose the Right Adapter for the Job
 *    - SQLite: Development, testing, embedded apps, small apps
 *    - PostgreSQL: Production, high concurrency, complex queries
 *
 * 3. Environment-Based Configuration
 *    - Use SQLite for local development
 *    - Use PostgreSQL for staging/production
 *    - Use in-memory SQLite for tests
 *
 * 4. Migration Path
 *    - Start with SQLite during development
 *    - Migrate to PostgreSQL as you scale
 *    - Keep the same application code
 *
 * 5. Adapter-Specific Optimizations
 *    - Each adapter has its own performance tuning options
 *    - Use adapter-specific features when needed
 *    - Abstract common patterns in your application layer
 */
