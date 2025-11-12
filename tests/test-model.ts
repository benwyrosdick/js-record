/**
 * Test script to verify Model functionality
 *
 * Usage:
 *   ts-node test-model.ts
 */

import { PostgresAdapter, Model } from '../src/index';

// Define a User model
class User extends Model {
  id!: number;
  name!: string;
  email!: string;
  age?: number;
  active!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static config = {
    tableName: 'users',
    primaryKey: 'id',
    timestamps: true,
  };
}

// Define a Post model (custom table name)
class BlogPost extends Model {
  id!: number;
  user_id!: number;
  title!: string;
  content!: string;
  created_at!: Date;
  updated_at!: Date;

  static config = {
    tableName: 'posts', // Override default 'blog_posts'
    primaryKey: 'id',
    timestamps: true,
  };
}

async function testModel() {
  console.log('🧪 Testing Model (ActiveRecord Pattern)...\n');

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'js_record_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };

  const adapter = new PostgresAdapter(config);

  try {
    await adapter.connect();
    console.log('✅ Connected to database\n');

    // Set adapter for all models
    Model.setAdapter(adapter);

    // Setup: Create tables
    console.log('📋 Setting up test tables...');
    await adapter.execute('DROP TABLE IF EXISTS posts CASCADE');
    await adapter.execute('DROP TABLE IF EXISTS users CASCADE');
    await adapter.execute(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        age INTEGER,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await adapter.execute(`
      CREATE TABLE posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tables created\n');

    // Test 1: Create a new record
    console.log('1️⃣  Create a new record:');
    const user1 = new User();
    user1.name = 'Alice Johnson';
    user1.email = 'alice@example.com';
    user1.age = 28;
    user1.active = true;
    await user1.save();
    console.log(`   ✅ Created user: ${user1.name} (ID: ${user1.id})`);
    console.log(`   Timestamps: createdAt=${user1.createdAt}, updatedAt=${user1.updatedAt}\n`);

    // Test 2: Create using static method
    console.log('2️⃣  Create using Model.create():');
    const user2 = await User.create({
      name: 'Bob Smith',
      email: 'bob@example.com',
      age: 35,
      active: true,
    });
    console.log(`   ✅ Created user: ${user2.name} (ID: ${user2.id})\n`);

    // Test 3: Create more users
    await User.create({
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      age: 42,
      active: false,
    });
    await User.create({ name: 'Diana Prince', email: 'diana@example.com', age: 30, active: true });
    console.log('3️⃣  Created additional test users\n');

    // Test 4: Find by ID
    console.log('4️⃣  Find by ID:');
    const foundUser = await User.find(1);
    console.log(`   ✅ Found user: ${foundUser?.name} (${foundUser?.email})\n`);

    // Test 5: Find by conditions
    console.log('5️⃣  Find by conditions:');
    const bobUser = await User.findBy({ email: 'bob@example.com' });
    console.log(`   ✅ Found user by email: ${bobUser?.name}\n`);

    // Test 6: Get all records
    console.log('6️⃣  Get all records:');
    const allUsers = await User.all();
    console.log(`   ✅ Total users: ${allUsers.length}`);
    allUsers.forEach(u => console.log(`      - ${u.name} (${u.email})`));
    console.log();

    // Test 7: Get first and last
    console.log('7️⃣  Get first and last:');
    const firstUser = await User.first();
    const lastUser = await User.last();
    console.log(`   ✅ First: ${firstUser?.name}`);
    console.log(`   ✅ Last: ${lastUser?.name}\n`);

    // Test 8: Count records
    console.log('8️⃣  Count records:');
    const totalCount = await User.count();
    const activeCount = await User.count({ active: true });
    console.log(`   ✅ Total users: ${totalCount}`);
    console.log(`   ✅ Active users: ${activeCount}\n`);

    // Test 9: Check existence
    console.log('9️⃣  Check existence:');
    const hasInactive = await User.exists({ active: false });
    console.log(`   ✅ Has inactive users: ${hasInactive}\n`);

    // Test 10: Update a record
    console.log('🔟 Update a record:');
    if (foundUser) {
      const oldAge = foundUser.age;
      foundUser.age = 29;
      await foundUser.save();
      console.log(`   ✅ Updated age: ${oldAge} → ${foundUser.age}`);
      console.log(`   Updated timestamp: ${foundUser.updatedAt}\n`);
    }

    // Test 11: Update using instance method
    console.log('1️⃣1️⃣  Update using .update():');
    if (bobUser) {
      await bobUser.update({ age: 36 });
      console.log(`   ✅ Updated Bob's age to ${bobUser.age}\n`);
    }

    // Test 12: Update using static method
    console.log('1️⃣2️⃣  Update using Model.update():');
    const updatedUser = await User.update(1, { name: 'Alice Johnson-Smith' });
    console.log(`   ✅ Updated name: ${updatedUser.name}\n`);

    // Test 13: Query builder integration
    console.log('1️⃣3️⃣  Query builder integration:');
    const activeUsers = await User.where({ active: true }).orderBy('age', 'DESC').limit(2).all();
    console.log(`   ✅ Active users (top 2 by age):`);
    activeUsers.forEach(u => console.log(`      - ${u.name}, age ${u.age}`));
    console.log();

    // Test 14: Check if record is persisted
    console.log('1️⃣4️⃣  Check record state:');
    const newUser = new User();
    newUser.name = 'Eve';
    newUser.email = 'eve@example.com';
    console.log(`   Before save - isNewRecord: ${newUser.isNewRecord()}`);
    await newUser.save();
    console.log(`   After save - isNewRecord: ${newUser.isNewRecord()}`);
    console.log(`   isPersisted: ${newUser.isPersisted()}\n`);

    // Test 15: Track changes
    console.log('1️⃣5️⃣  Track changes:');
    const user = await User.find(1);
    if (user) {
      console.log(`   Before changes - hasChanges: ${user.hasChanges()}`);
      user.name = 'Alice Updated';
      user.age = 99;
      console.log(`   After changes - hasChanges: ${user.hasChanges()}`);
      console.log(`   Changes: ${JSON.stringify(user.getChanges())}`);
      await user.save();
      console.log(`   After save - hasChanges: ${user.hasChanges()}\n`);
    }

    // Test 16: Reload record
    console.log('1️⃣6️⃣  Reload record:');
    const userToReload = await User.find(1);
    if (userToReload) {
      const oldName = userToReload.name;
      // Simulate external change
      await adapter.execute('UPDATE users SET name = $1 WHERE id = $2', ['Alice Reloaded', 1]);
      await userToReload.reload();
      console.log(`   ✅ Reloaded: ${oldName} → ${userToReload.name}\n`);
    }

    // Test 17: toJSON
    console.log('1️⃣7️⃣  Convert to JSON:');
    const jsonUser = await User.find(1);
    if (jsonUser) {
      const json = jsonUser.toJSON();
      console.log(`   ✅ JSON: ${JSON.stringify(json, null, 2)}\n`);
    }

    // Test 18: Delete a record (instance method)
    console.log('1️⃣8️⃣  Delete record (instance):');
    const userToDelete = await User.findBy({ email: 'eve@example.com' });
    if (userToDelete) {
      await userToDelete.destroy();
      const stillExists = await User.exists({ email: 'eve@example.com' });
      console.log(`   ✅ Deleted user, still exists: ${stillExists}\n`);
    }

    // Test 19: Delete using static method
    console.log('1️⃣9️⃣  Delete record (static):');
    const deleted = await User.destroy(4);
    console.log(`   ✅ Deleted user ID 4: ${deleted}\n`);

    // Test 20: Custom table name (BlogPost)
    console.log('2️⃣0️⃣  Custom table name (BlogPost → posts):');
    const post = await BlogPost.create({
      user_id: 1,
      title: 'My First Blog Post',
      content: 'This is the content of my first post.',
    });
    console.log(`   ✅ Created post: "${post.title}" (ID: ${post.id})`);
    console.log(`   Table name: ${BlogPost.getTableName()}\n`);

    // Test 21: Find or fail
    console.log('2️⃣1️⃣  Find or fail:');
    try {
      const existingUser = await User.findOrFail(1);
      console.log(`   ✅ Found user: ${existingUser.name}`);
    } catch (error) {
      console.log(`   ❌ Error: ${(error as Error).message}`);
    }

    try {
      await User.findOrFail(9999);
      console.log(`   ❌ Should have thrown error`);
    } catch (error) {
      console.log(`   ✅ Correctly threw error: ${(error as Error).message}`);
    }
    console.log();

    // Test 22: Complex query with WHERE
    console.log('2️⃣2️⃣  Complex WHERE query:');
    const youngActiveUsers = await User.where({ active: true })
      .where('age', '<', 35)
      .orderBy('age', 'ASC')
      .all();
    console.log(`   ✅ Young active users (age < 35):`);
    youngActiveUsers.forEach(u => console.log(`      - ${u.name}, age ${u.age}`));
    console.log();

    // Test 23: Test timestamps are automatically set
    console.log('2️⃣3️⃣  Automatic timestamps:');
    const timestampUser = await User.create({
      name: 'Timestamp Test',
      email: 'timestamp@example.com',
      age: 25,
      active: true,
    });
    console.log(`   ✅ Created at: ${timestampUser.createdAt}`);
    console.log(`   ✅ Updated at: ${timestampUser.updatedAt}`);

    // Wait a bit and update
    await new Promise(resolve => setTimeout(resolve, 100));
    await timestampUser.update({ age: 26 });
    console.log(`   ✅ Updated at (after update): ${timestampUser.updatedAt}`);
    console.log(
      `   ✅ Timestamps are different: ${timestampUser.createdAt < timestampUser.updatedAt}\n`
    );

    console.log('✨ All Model tests passed!\n');

    // Cleanup
    console.log('🧹 Cleaning up...');
    await adapter.execute('DROP TABLE IF EXISTS posts');
    await adapter.execute('DROP TABLE IF EXISTS users');
    console.log('✅ Cleanup complete\n');
  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await adapter.disconnect();
    console.log('👋 Disconnected from database');
  }
}

// Run tests
testModel().catch(console.error);
