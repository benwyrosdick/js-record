# js-record

A TypeScript ORM, inspired by Ruby's ActiveRecord, designed for PostgreSQL, MySQL, and SQLite running on bun.

## Features

- **ActiveRecord Pattern**: Models inherit from a base class, combining data access and business logic
- **Type Safety**: Full TypeScript support with compile-time type checking
- **Database Agnostic**: Adapter pattern allows support for multiple databases
- **Query Builder**: Fluent, chainable query interface
- **Associations**: Support for belongsTo, hasOne, hasMany, and many-to-many relationships
- **Validations**: Comprehensive validation system with built-in and custom validators
- **Callbacks/Hooks**: Lifecycle hooks for running code at specific points
- **Transactions**: Full ACID transaction support
- **Schema Introspection**: Inspect database schema at runtime

## Installation

```bash
# using bun
bun add js-record
```

## Quick Start

### Setting Up a Database Connection

#### PostgreSQL

```typescript
import { PostgresAdapter } from 'js-record';

const adapter = new PostgresAdapter({
  host: 'localhost',
  port: 5432,
  database: 'myapp_development',
  user: 'postgres',
  password: 'password',
});

await adapter.connect();
```

#### SQLite (Bun Native)

```typescript
import { SqliteAdapter } from 'js-record';

// File-based database
const adapter = new SqliteAdapter({
  database: './myapp.db',
});

// Or use in-memory database
const adapter = new SqliteAdapter({
  database: ':memory:',
});

await adapter.connect();
```

### Defining Models

```typescript
import { Model } from 'js-record';

class User extends Model {
  id!: number;
  name!: string;
  email!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

class Post extends Model {
  id!: number;
  userId!: number;
  title!: string;
  content!: string;
  published!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

// Set database adapter for all models
Model.setAdapter(adapter);
```

### CRUD Operations

```typescript
// Create
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
});

// Read
const foundUser = await User.find(1);
const userByEmail = await User.findBy({ email: 'john@example.com' });
const allUsers = await User.all();

// Update
user.name = 'Jane Doe';
await user.save();
// or
await user.update({ name: 'Jane Doe' });

// Delete
await user.destroy();
```

### Query Builder

```typescript
// Chainable queries
const activeUsers = await User.where({ active: true }).orderBy('createdAt', 'DESC').limit(10).all();

// Complex queries
const posts = await Post.where('published = ?', true)
  .where('createdAt > ?', thirtyDaysAgo)
  .orderBy('views', 'DESC')
  .all();

// Counting
const count = await User.where({ active: true }).count();

// Existence check
const exists = await User.where({ email: 'john@example.com' }).exists();
```

### Scopes

Define reusable query conditions:

```typescript
// Define scopes
Post.scope('published', query => {
  return query.where({ status: 'published' });
});

Post.scope('popular', (query, minViews = 100) => {
  return query.where('views >= ?', minViews);
});

Post.scope('recent', query => {
  return query.orderBy('createdAt', 'DESC').limit(10);
});

// Use scopes
const publishedPosts = await (Post as any).published().all();
const popularPosts = await (Post as any).popular(500).all();

// Chain scopes with queries
const featured = await (Post as any)
  .published()
  .where({ isFeatured: true })
  .orderBy('views', 'DESC')
  .all();

// Default scope (applied to all queries)
User.defaultScope({
  where: { deletedAt: null }, // Soft delete
  order: ['name', 'ASC'],
});

// Bypass default scope when needed
const allUsers = await User.unscoped().all();
```

### Associations

Define relationships between models:

```typescript
// One-to-many
User.hasMany('posts', Post);
Post.belongsTo('user', User);

// One-to-one
User.hasOne('profile', Profile);
Profile.belongsTo('user', User);

// Many-to-many
Post.hasManyThrough('tags', Tag, {
  through: 'post_tags',
  foreignKey: 'postId',
  throughForeignKey: 'tagId',
});

// Usage
const user = await User.find(1);
const posts = await user.posts.all();
const profile = await user.profile;

const post = await Post.find(1);
const author = await post.user;
const tags = await post.tags.all();

// Create associated records
await user.posts.create({
  title: 'New Post',
  content: 'Content here',
});

// Add to many-to-many
const tag = await Tag.find(1);
await post.tags.add(tag);
```

### Validations

Define validation rules to ensure data integrity:

```typescript
class User extends Model {
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
      confirmation: true, // Requires passwordConfirmation field
    },
    status: {
      inclusion: {
        in: ['active', 'inactive', 'pending'],
      },
    },
    website: {
      format: {
        pattern: /^https?:\/\/.+/,
        message: 'must be a valid URL',
      },
    },
  };
}

// Usage
const user = new User();
user.name = 'John';
user.email = 'invalid-email';

const isValid = await user.validate();
console.log(isValid); // false
console.log(user.errors); // { email: ['must be a valid email address'] }

// save() automatically validates
const saved = await user.save(); // false (validation failed)

// Skip validation if needed
await user.save({ validate: false });
```

**Available Validations:**

- `presence` - Requires value to be present
- `length` - Min/max/exact length for strings and arrays
- `format` - Regex pattern matching
- `numericality` - Number validation with constraints
- `uniqueness` - Database uniqueness check
- `inclusion` - Value must be in list
- `exclusion` - Value must not be in list
- `confirmation` - Field must match confirmation field
- `custom` - Custom validation function

### Callbacks/Hooks

Run code at specific points in a model's lifecycle:

```typescript
class Article extends Model {
  // Instance method callbacks
  beforeSave() {
    // Generate slug from title
    if (!this.slug && this.title) {
      this.slug = this.title.toLowerCase().replace(/\s+/g, '-');
    }
  }

  afterCreate() {
    console.log('Article created!');
    // Send notifications, update cache, etc.
  }

  beforeDestroy() {
    // Clean up associated records
    return confirm('Are you sure?'); // Return false to halt
  }
}

// Class-level callbacks
User.beforeCreate('hashPassword');
User.afterCreate('sendWelcomeEmail');

// Conditional callbacks
Post.afterCreate(
  model => {
    // Send publication notification
  },
  { if: model => model.status === 'published' }
);
```

**Available Callbacks:**

- `beforeValidation` / `afterValidation`
- `beforeSave` / `afterSave`
- `beforeCreate` / `afterCreate`
- `beforeUpdate` / `afterUpdate`
- `beforeDestroy` / `afterDestroy`

Returning `false` from a `before*` callback halts the chain and prevents the operation.

### Transactions

```typescript
const transaction = await adapter.beginTransaction();
try {
  await transaction.execute('INSERT INTO users (name) VALUES ($1)', ['Alice']);
  await transaction.execute('INSERT INTO profiles (userId) VALUES ($1)', [1]);
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
}
```

## Project Status

🚧 **Work in Progress** - This library is under active development.

### Completed

- ✅ Base adapter interface
- ✅ PostgreSQL adapter with connection pooling
- ✅ Transaction support
- ✅ Schema introspection
- ✅ Query Builder
- ✅ Base Model class
- ✅ CRUD operations
- ✅ Associations (belongsTo, hasOne, hasMany, hasManyThrough)
- ✅ Validations (presence, length, format, numericality, uniqueness, custom, etc.)
- ✅ Callbacks/Hooks (lifecycle hooks with conditional execution)
- ✅ Migrations
- ✅ SQLite adapter with Bun's native SQLite support
- ✅ Scopes (reusable query conditions)

### Planned

- 📋 Eager loading (includes)
- 📋 MySQL adapter

## Development

This project uses [Just](https://github.com/casey/just) as a command runner for common tasks.

### Quick Start

```bash
# Install Just (if not already installed)
# macOS: brew install just
# Linux: curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /usr/local/bin

# List all available commands
just --list

# Common commands
just install      # Install dependencies
just build        # Build the project
just test         # Run all tests
just quick-test   # Run fast SQLite tests
just check        # Type check, lint, and format check
just dev          # Clean, build, and test
```

### Using npm/bun scripts (alternative)

```bash
# Install dependencies
bun install

# Build the project
bun run build

# Watch mode for development
bun run build:watch

# Type checking
bun run typecheck

# Linting
bun run lint

# Format code
bun run format

# Run tests
bun run test:sqlite
```

See [docs/JUSTFILE.md](docs/JUSTFILE.md) for complete Justfile documentation.

## Architecture

The library is organized into modular components:

```
src/
├── adapters/       # Database adapters
├── core/           # Core ORM functionality (coming soon)
├── associations/   # Relationship management (coming soon)
├── validations/    # Validation framework (coming soon)
└── callbacks/      # Hook system (coming soon)
```

## Database Support

Currently supported:

- **PostgreSQL** - Full support using Bun's native PostgreSQL driver
- **SQLite** - Full support using Bun's native SQLite (file-based and in-memory)
  - See [SQLite Guide](docs/SQLITE.md) for detailed documentation

Planned:

- MySQL
- SQL Server

## Contributing

This is an open-source project. Contributions are welcome!

## License

MIT
