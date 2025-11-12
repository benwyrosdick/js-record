/**
 * Example usage of validations
 * Demonstrates all validation types
 */

import { Model } from '../src/core/Model';
import { PostgresAdapter } from '../src/adapters/PostgresAdapter';

// Initialize the database adapter
const adapter = new PostgresAdapter({
  host: 'localhost',
  port: 5432,
  database: 'js_record_dev',
  user: 'postgres',
  password: 'postgres',
});

Model.setAdapter(adapter);

// Define a model with comprehensive validations
class User extends Model {
  id!: number;
  name!: string;
  email!: string;
  age?: number;
  username!: string;
  password?: string;
  passwordConfirmation?: string;
  status?: string;
  website?: string;
  score?: number;
  role?: string;
  createdAt!: Date;
  updatedAt!: Date;

  // Define validation rules
  static validations = {
    // Presence validation
    name: {
      presence: true,
      length: { min: 2, max: 100 },
    },

    // Email with format and uniqueness
    email: {
      presence: true,
      format: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'must be a valid email address',
      },
      uniqueness: true,
    },

    // Numericality validation
    age: {
      numericality: {
        onlyInteger: true,
        greaterThanOrEqualTo: 0,
        lessThanOrEqualTo: 150,
      },
    },

    // Username with case-insensitive uniqueness
    username: {
      presence: true,
      length: { min: 3, max: 20 },
      uniqueness: { caseSensitive: false },
    },

    // Password with confirmation
    password: {
      length: { min: 8, message: 'must be at least 8 characters' },
      confirmation: true,
    },

    // Inclusion validation
    status: {
      inclusion: {
        in: ['active', 'inactive', 'pending'],
        message: 'must be active, inactive, or pending',
      },
    },

    // Format validation for URL
    website: {
      format: {
        pattern: /^https?:\/\/.+/,
        message: 'must be a valid URL starting with http:// or https://',
      },
    },

    // Even number validation
    score: {
      numericality: {
        even: true,
      },
    },

    // Exclusion validation
    role: {
      exclusion: {
        in: ['admin', 'superadmin'],
        message: 'is reserved',
      },
    },
  };
}

// Model with custom validation
class Product extends Model {
  id!: number;
  name!: string;
  price!: number;
  discountPrice?: number;
  createdAt!: Date;
  updatedAt!: Date;

  static validations = {
    name: {
      presence: true,
    },
    price: {
      presence: true,
      numericality: {
        greaterThan: 0,
      },
    },
    discountPrice: {
      // Custom validation: discountPrice must be less than price
      custom: {
        validator: async (value: any, model: Model) => {
          const product = model as Product;
          if (value === null || value === undefined) {
            return true; // Optional field
          }
          return value < product.price;
        },
        message: 'must be less than the regular price',
      },
    },
  };
}

async function demonstrateValidations() {
  try {
    await adapter.connect();

    console.log('=== Validation Examples ===\n');

    // Example 1: Invalid user (presence errors)
    console.log('1. Invalid user (missing required fields):');
    const user1 = new User();
    const isValid1 = await user1.validate();
    console.log('Valid:', isValid1);
    console.log('Errors:', user1.errors);
    console.log();

    // Example 2: Invalid email format
    console.log('2. Invalid email format:');
    const user2 = new User();
    user2.name = 'John Doe';
    user2.username = 'john';
    user2.email = 'invalid-email';
    const isValid2 = await user2.validate();
    console.log('Valid:', isValid2);
    console.log('Errors:', user2.errors);
    console.log();

    // Example 3: Password confirmation mismatch
    console.log('3. Password confirmation mismatch:');
    const user3 = new User();
    user3.name = 'Jane Doe';
    user3.username = 'jane';
    user3.email = 'jane@example.com';
    user3.password = 'password123';
    user3.passwordConfirmation = 'different';
    const isValid3 = await user3.validate();
    console.log('Valid:', isValid3);
    console.log('Errors:', user3.errors);
    console.log();

    // Example 4: Valid user
    console.log('4. Valid user:');
    const user4 = new User();
    user4.name = 'Alice Smith';
    user4.username = 'alice';
    user4.email = 'alice@example.com';
    user4.age = 30;
    user4.status = 'active';
    user4.website = 'https://alice.com';
    user4.score = 100;
    user4.role = 'user';
    user4.password = 'securepassword';
    user4.passwordConfirmation = 'securepassword';

    const isValid4 = await user4.validate();
    console.log('Valid:', isValid4);
    console.log('Errors:', user4.errors);

    if (isValid4) {
      const saved = await user4.save();
      console.log('Saved:', saved);
      console.log('User ID:', user4.id);
    }
    console.log();

    // Example 5: Save bypassing validation
    console.log('5. Save without validation:');
    const user5 = new User();
    user5.name = 'Bob';
    user5.username = 'bob';
    user5.email = 'bob@example.com';
    // Skipping password requirements
    const saved5 = await user5.save({ validate: false });
    console.log('Saved:', saved5);
    console.log();

    // Example 6: Custom validation
    console.log('6. Custom validation (discount must be less than price):');
    const product1 = new Product();
    product1.name = 'Widget';
    product1.price = 100;
    product1.discountPrice = 150; // Invalid: greater than price

    const isValidProduct1 = await product1.validate();
    console.log('Valid:', isValidProduct1);
    console.log('Errors:', product1.errors);
    console.log();

    // Example 7: Valid product with discount
    console.log('7. Valid product with discount:');
    const product2 = new Product();
    product2.name = 'Gadget';
    product2.price = 100;
    product2.discountPrice = 80;

    const isValidProduct2 = await product2.validate();
    console.log('Valid:', isValidProduct2);
    console.log('Errors:', product2.errors);
    console.log();

    // Example 8: Checking specific field errors
    console.log('8. Getting specific field errors:');
    const user6 = new User();
    user6.email = 'bad-email';
    await user6.validate();
    console.log('Email errors:', user6.getFieldErrors('email'));
    console.log('Name errors:', user6.getFieldErrors('name'));
    console.log();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await adapter.disconnect();
  }
}

// Run the examples
demonstrateValidations();
