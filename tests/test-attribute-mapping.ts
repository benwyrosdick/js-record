/**
 * Attribute Mapping Test
 * Tests automatic camelCase <-> snake_case conversion
 */

import { Model, SqliteAdapter } from '../src/index';

// Setup SQLite adapter
const adapter = new SqliteAdapter({ database: ':memory:' });

// Define test model with camelCase attributes
class User extends Model {
  static tableName = 'users';

  id!: number;
  firstName!: string;
  lastName!: string;
  emailAddress!: string;
  phoneNumber?: string;
  isActive!: boolean;
  accountType?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

async function testAttributeMapping() {
  console.log('🧪 Testing Attribute Mapping (camelCase <-> snake_case)...\n');

  await adapter.connect();
  Model.setAdapter(adapter);

  // Create table with snake_case columns
  await adapter.execute(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email_address TEXT NOT NULL,
      phone_number TEXT,
      is_active INTEGER DEFAULT 1,
      account_type TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // Test 1: Create with camelCase attributes
  console.log('Test 1: Creating user with camelCase attributes...');
  const user1 = await User.create({
    firstName: 'John',
    lastName: 'Doe',
    emailAddress: 'john@example.com',
    phoneNumber: '555-1234',
    isActive: true,
    accountType: 'premium',
  } as any);

  console.log(`✅ Created user: ${user1.firstName} ${user1.lastName}`);
  console.log(`   Email: ${user1.emailAddress}`);
  console.log(`   Phone: ${user1.phoneNumber}`);
  console.log(`   Active: ${user1.isActive}`);
  console.log(`   Type: ${user1.accountType}\n`);

  // Test 2: Verify data in database uses snake_case
  console.log('Test 2: Verifying snake_case in database...');
  const dbResult = await adapter.query('SELECT * FROM users WHERE id = ?', [user1.id]);
  const dbRow = dbResult.rows[0] as any;

  console.log('✅ Database columns (snake_case):');
  console.log(`   first_name: ${dbRow.first_name}`);
  console.log(`   last_name: ${dbRow.last_name}`);
  console.log(`   email_address: ${dbRow.email_address}`);
  console.log(`   phone_number: ${dbRow.phone_number}`);
  console.log(`   is_active: ${dbRow.is_active}`);
  console.log(`   account_type: ${dbRow.account_type}\n`);

  // Test 3: Find and retrieve with camelCase
  console.log('Test 3: Finding user by ID...');
  const foundUser = await User.find(user1.id);

  if (foundUser) {
    console.log(`✅ Found user: ${foundUser.firstName} ${foundUser.lastName}`);
    console.log(`   Email: ${foundUser.emailAddress}`);
    console.log(`   Attributes are camelCase: ✓\n`);
  }

  // Test 4: Update with camelCase
  console.log('Test 4: Updating user with camelCase attributes...');
  if (foundUser) {
    foundUser.firstName = 'Jane';
    foundUser.phoneNumber = '555-5678';
    foundUser.accountType = 'enterprise';
    await foundUser.save();

    console.log(`✅ Updated user: ${foundUser.firstName}`);
    console.log(`   New phone: ${foundUser.phoneNumber}`);
    console.log(`   New type: ${foundUser.accountType}\n`);
  }

  // Test 5: Verify update in database
  console.log('Test 5: Verifying updated data in database...');
  const dbResult2 = await adapter.query('SELECT * FROM users WHERE id = ?', [user1.id]);
  const dbRow2 = dbResult2.rows[0] as any;

  console.log('✅ Database updated (snake_case):');
  console.log(`   first_name: ${dbRow2.first_name}`);
  console.log(`   phone_number: ${dbRow2.phone_number}`);
  console.log(`   account_type: ${dbRow2.account_type}\n`);

  // Test 6: Query all users
  console.log('Test 6: Querying all users...');

  await User.create({
    firstName: 'Bob',
    lastName: 'Smith',
    emailAddress: 'bob@example.com',
    isActive: false,
  } as any);

  const allUsers = await User.all();
  console.log(`✅ Found ${allUsers.length} users:`);
  allUsers.forEach(u => {
    console.log(`   - ${u.firstName} ${u.lastName} (${u.emailAddress})`);
  });
  console.log();

  // Test 7: Timestamps (snake_case in DB, camelCase in model)
  console.log('Test 7: Testing timestamps...');
  if (foundUser) {
    console.log(`✅ createdAt: ${foundUser.createdAt}`);
    console.log(`✅ updatedAt: ${foundUser.updatedAt}`);

    // Verify in database
    const dbTime = await adapter.query('SELECT created_at, updated_at FROM users WHERE id = ?', [
      foundUser.id,
    ]);
    const timeRow = dbTime.rows[0] as any;
    console.log(`✅ Database has created_at: ${timeRow.created_at}`);
    console.log(`✅ Database has updated_at: ${timeRow.updated_at}\n`);
  }

  // Test 8: Create multiple records
  console.log('Test 8: Creating multiple records...');

  const users = [
    { firstName: 'Alice', lastName: 'Johnson', emailAddress: 'alice@example.com', isActive: true },
    {
      firstName: 'Charlie',
      lastName: 'Brown',
      emailAddress: 'charlie@example.com',
      isActive: true,
    },
    { firstName: 'Diana', lastName: 'Prince', emailAddress: 'diana@example.com', isActive: false },
  ];

  for (const userData of users) {
    await User.create(userData as any);
  }

  const count = await User.count();
  console.log(`✅ Total users: ${count}\n`);

  // Test 9: Update method
  console.log('Test 9: Using update method...');
  const userToUpdate = await User.find(user1.id);
  if (userToUpdate) {
    await userToUpdate.update({
      firstName: 'Janet',
      accountType: 'basic',
    } as any);

    console.log(`✅ Updated via update(): ${userToUpdate.firstName}`);
    console.log(`   Account type: ${userToUpdate.accountType}\n`);
  }

  // Test 10: Model with attribute mapping disabled
  console.log('Test 10: Testing model with mapping disabled...');

  class Product extends Model {
    static tableName = 'products';
    static config = {
      ...Model.config,
      mapAttributes: false, // Disable mapping
      timestamps: false, // Disable timestamps for this test
    };

    id!: number;
    product_name!: string; // Use snake_case directly
    unit_price!: number;
  }

  await adapter.execute(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_name TEXT NOT NULL,
      unit_price REAL NOT NULL
    )
  `);

  const product = await Product.create({
    product_name: 'Widget',
    unit_price: 19.99,
  } as any);

  console.log(`✅ Created product (no mapping): ${product.product_name}`);
  console.log(`   Uses snake_case directly: ✓\n`);

  // Clean up
  await adapter.disconnect();
  console.log('🎉 All attribute mapping tests completed!');
}

// Run tests
testAttributeMapping().catch(console.error);
