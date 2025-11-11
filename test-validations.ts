/**
 * Test validations functionality
 */

import { Model } from './src/core/Model';
import { PostgresAdapter } from './src/adapters/PostgresAdapter';

// Initialize database adapter
const adapter = new PostgresAdapter({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

Model.setAdapter(adapter);

// Setup database
async function setupDatabase() {
  console.log('=== Setting up database ===');

  try {
    await adapter.execute('DROP TABLE IF EXISTS users CASCADE');

    await adapter.execute(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        age INTEGER,
        username VARCHAR(50),
        password VARCHAR(255),
        status VARCHAR(50),
        website VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Database tables created\n');
  } catch (error) {
    console.error('Failed to setup database:', error);
    throw error;
  }
}

// Define model with validations
class User extends Model {
  id!: number;
  name!: string;
  email!: string;
  age?: number;
  username!: string;
  password?: string;
  password_confirmation?: string;
  status?: string;
  website?: string;
  created_at!: Date;
  updated_at!: Date;

  static validations = {
    name: {
      presence: true,
      length: { min: 2, max: 100 },
    },
    email: {
      presence: true,
      format: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'must be a valid email address',
      },
      uniqueness: true,
    },
    age: {
      numericality: {
        onlyInteger: true,
        greaterThanOrEqualTo: 0,
        lessThanOrEqualTo: 150,
      },
    },
    username: {
      presence: true,
      length: { min: 3, max: 20 },
      uniqueness: { caseSensitive: false },
    },
    password: {
      length: { min: 8 },
      confirmation: true,
    },
    status: {
      inclusion: {
        in: ['active', 'inactive', 'pending'],
        message: 'must be active, inactive, or pending',
      },
    },
    website: {
      format: {
        pattern: /^https?:\/\/.+/,
        message: 'must be a valid URL starting with http:// or https://',
      },
    },
  };
}

// Test functions
async function testPresenceValidation() {
  console.log('=== Testing Presence Validation ===');

  const user = new User();
  const isValid = await user.validate();

  console.log('Valid?', isValid);
  console.log('Errors:', user.errors);

  if (!isValid && user.errors.name && user.errors.email && user.errors.username) {
    console.log('✓ Presence validation test passed\n');
  } else {
    throw new Error('Presence validation failed');
  }
}

async function testLengthValidation() {
  console.log('=== Testing Length Validation ===');

  // Too short
  const user1 = new User();
  user1.name = 'A';
  user1.email = 'test@example.com';
  user1.username = 'ab';

  const isValid1 = await user1.validate();
  console.log('Too short - Valid?', isValid1);
  console.log('Errors:', user1.errors);

  if (!isValid1 && user1.errors.name && user1.errors.username) {
    console.log('✓ Length (too short) validation passed');
  } else {
    throw new Error('Length validation (too short) failed');
  }

  // Too long
  const user2 = new User();
  user2.name = 'A'.repeat(101);
  user2.email = 'test2@example.com';
  user2.username = 'a'.repeat(21);

  const isValid2 = await user2.validate();
  console.log('\nToo long - Valid?', isValid2);
  console.log('Errors:', user2.errors);

  if (!isValid2 && user2.errors.name && user2.errors.username) {
    console.log('✓ Length (too long) validation passed\n');
  } else {
    throw new Error('Length validation (too long) failed');
  }
}

async function testFormatValidation() {
  console.log('=== Testing Format Validation ===');

  const user = new User();
  user.name = 'John Doe';
  user.username = 'johndoe';
  user.email = 'invalid-email';
  user.website = 'not-a-url';

  const isValid = await user.validate();
  console.log('Valid?', isValid);
  console.log('Errors:', user.errors);

  if (!isValid && user.errors.email && user.errors.website) {
    console.log('✓ Format validation test passed\n');
  } else {
    throw new Error('Format validation failed');
  }
}

async function testNumericalityValidation() {
  console.log('=== Testing Numericality Validation ===');

  // Negative age
  const user1 = new User();
  user1.name = 'John Doe';
  user1.email = 'john1@example.com';
  user1.username = 'john1';
  user1.age = -5;

  const isValid1 = await user1.validate();
  console.log('Negative age - Valid?', isValid1);
  console.log('Errors:', user1.errors);

  if (!isValid1 && user1.errors.age) {
    console.log('✓ Numericality (negative) validation passed');
  }

  // Too old
  const user2 = new User();
  user2.name = 'John Doe';
  user2.email = 'john2@example.com';
  user2.username = 'john2';
  user2.age = 200;

  const isValid2 = await user2.validate();
  console.log('\nToo old - Valid?', isValid2);
  console.log('Errors:', user2.errors);

  if (!isValid2 && user2.errors.age) {
    console.log('✓ Numericality (too old) validation passed\n');
  } else {
    throw new Error('Numericality validation failed');
  }
}

async function testUniquenessValidation() {
  console.log('=== Testing Uniqueness Validation ===');

  // Create first user
  const user1 = new User();
  user1.name = 'Jane Doe';
  user1.email = 'jane@example.com';
  user1.username = 'janedoe';

  const saved = await user1.save();
  console.log('First user saved?', saved);

  // Try to create duplicate email
  const user2 = new User();
  user2.name = 'John Doe';
  user2.email = 'jane@example.com'; // Duplicate email
  user2.username = 'johndoe';

  const isValid = await user2.validate();
  console.log('Duplicate email - Valid?', isValid);
  console.log('Errors:', user2.errors);

  if (!isValid && user2.errors.email) {
    console.log('✓ Uniqueness validation test passed\n');
  } else {
    throw new Error('Uniqueness validation failed');
  }
}

async function testInclusionValidation() {
  console.log('=== Testing Inclusion Validation ===');

  const user = new User();
  user.name = 'John Doe';
  user.email = 'john3@example.com';
  user.username = 'john3';
  user.status = 'invalid-status';

  const isValid = await user.validate();
  console.log('Valid?', isValid);
  console.log('Errors:', user.errors);

  if (!isValid && user.errors.status) {
    console.log('✓ Inclusion validation test passed\n');
  } else {
    throw new Error('Inclusion validation failed');
  }
}

async function testConfirmationValidation() {
  console.log('=== Testing Confirmation Validation ===');

  const user = new User();
  user.name = 'John Doe';
  user.email = 'john4@example.com';
  user.username = 'john4';
  user.password = 'mypassword123';
  user.password_confirmation = 'different';

  const isValid = await user.validate();
  console.log('Valid?', isValid);
  console.log('Errors:', user.errors);

  if (!isValid && user.errors.password) {
    console.log('✓ Confirmation validation test passed\n');
  } else {
    throw new Error('Confirmation validation failed');
  }
}

async function testValidModel() {
  console.log('=== Testing Valid Model ===');

  const user = new User();
  user.name = 'Alice Smith';
  user.email = 'alice@example.com';
  user.username = 'alice';
  user.age = 30;
  user.status = 'active';
  user.website = 'https://alice.com';
  user.password = 'securepassword123';
  user.password_confirmation = 'securepassword123';

  const isValid = await user.validate();
  console.log('Valid?', isValid);
  console.log('Errors:', user.errors);

  if (isValid && Object.keys(user.errors).length === 0) {
    const saved = await user.save();
    console.log('Saved?', saved);
    console.log('User ID:', user.id);
    console.log('✓ Valid model test passed\n');
  } else {
    throw new Error('Valid model test failed');
  }
}

async function testSaveWithoutValidation() {
  console.log('=== Testing Save Without Validation ===');

  const user = new User();
  user.name = 'Bob';
  user.email = 'bob@example.com';
  user.username = 'bob';

  // Save without validation
  const saved = await user.save({ validate: false });
  console.log('Saved without validation?', saved);

  if (saved) {
    console.log('✓ Save without validation test passed\n');
  } else {
    throw new Error('Save without validation failed');
  }
}

async function cleanup() {
  console.log('=== Cleanup ===');
  await adapter.execute('DELETE FROM users');
  console.log('Cleaned up all test data\n');
}

// Run tests
async function runTests() {
  try {
    await adapter.connect();
    console.log('Connected to database\n');

    await setupDatabase();
    await cleanup();

    await testPresenceValidation();
    await testLengthValidation();
    await testFormatValidation();
    await testNumericalityValidation();
    await testUniquenessValidation();
    await testInclusionValidation();
    await testConfirmationValidation();
    await testValidModel();
    await testSaveWithoutValidation();

    console.log('=== All tests passed! ===');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await adapter.disconnect();
    console.log('\nDisconnected from database');
  }
}

runTests();
