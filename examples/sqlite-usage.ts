/**
 * SQLite Adapter Usage Example
 * Demonstrates how to use the SQLite adapter with Bun's native SQLite
 */

import { SqliteAdapter } from '../src/adapters';
import { Model } from '../src/core';

// Configure SQLite adapter
const adapter = new SqliteAdapter({
  database: './example.db', // File-based database
  // Use ':memory:' for in-memory database
});

// Connect to database
await adapter.connect();

// Set as global adapter for all models
Model.setAdapter(adapter);

// Define User model
class User extends Model {
  static tableName = 'users';

  id!: number;
  name!: string;
  email!: string;
  age?: number;
  createdAt?: Date;
}

// Create table (in a real app, you'd use migrations)
await adapter.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    age INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('🚀 SQLite Database Setup Complete!\n');

// Example 1: Create users
console.log('Example 1: Creating users...');
const user1 = new User();
user1.name = 'Alice Johnson';
user1.email = 'alice@example.com';
user1.age = 28;
await user1.save();
console.log('✅ Created:', user1);

const user2 = new User();
user2.name = 'Bob Smith';
user2.email = 'bob@example.com';
user2.age = 35;
await user2.save();
console.log('✅ Created:', user2, '\n');

// Example 2: Find all users
console.log('Example 2: Finding all users...');
const allUsers = await User.all();
console.log('✅ All users:', allUsers, '\n');

// Example 3: Find user by ID
console.log('Example 3: Finding user by ID...');
const foundUser = await User.find(1);
console.log('✅ Found user:', foundUser, '\n');

// Example 4: Query with conditions
console.log('Example 4: Query users where age > 30...');
const olderUsers = await User.where({ age: { $gt: 30 } }).all();
console.log('✅ Users over 30:', olderUsers, '\n');

// Example 5: Update user
console.log('Example 5: Updating user...');
if (foundUser) {
  foundUser.age = 29;
  await foundUser.save();
  console.log('✅ Updated user:', foundUser, '\n');
}

// Example 6: Delete user
console.log('Example 6: Deleting user...');
if (foundUser) {
  await foundUser.destroy();
  console.log('✅ User deleted\n');
}

// Example 7: Using transactions
console.log('Example 7: Using transactions...');
const tx = await adapter.beginTransaction();
try {
  await tx.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
    'Charlie Brown',
    'charlie@example.com',
    42,
  ]);

  await tx.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
    'Diana Prince',
    'diana@example.com',
    30,
  ]);

  await tx.commit();
  console.log('✅ Transaction committed\n');
} catch (error) {
  await tx.rollback();
  console.error('❌ Transaction rolled back:', error);
}

// Example 8: Raw queries
console.log('Example 8: Raw SQL queries...');
const result = await adapter.query('SELECT * FROM users WHERE age >= ? ORDER BY age', [30]);
console.log('✅ Users 30 and older:', result.rows, '\n');

// Example 9: Database info
console.log('Example 9: Database information...');
const version = await adapter.getVersion();
const tables = await adapter.getTables();
console.log(`✅ SQLite version: ${version}`);
console.log(`✅ Tables in database: ${tables.join(', ')}\n`);

// Clean up
console.log('Cleaning up...');
await adapter.disconnect();
console.log('✅ Disconnected from database');

/**
 * SQLite-specific features:
 *
 * 1. File-based or in-memory:
 *    - Use a file path for persistent storage: { database: './myapp.db' }
 *    - Use ':memory:' for in-memory database: { database: ':memory:' }
 *
 * 2. No server required:
 *    - SQLite is embedded, no separate database server needed
 *    - Perfect for development, testing, and small applications
 *
 * 3. Automatic type conversion:
 *    - INTEGER for whole numbers
 *    - REAL for floating point
 *    - TEXT for strings
 *    - BLOB for binary data
 *
 * 4. Foreign keys:
 *    - Enable with: PRAGMA foreign_keys = ON
 *    - Automatically enabled in this adapter
 *
 * 5. Transactions:
 *    - Full ACID compliance
 *    - Use beginTransaction() for explicit control
 *
 * 6. Performance tips:
 *    - Use transactions for bulk inserts
 *    - Add indexes for frequently queried columns
 *    - Use PRAGMA statements to tune performance
 */
