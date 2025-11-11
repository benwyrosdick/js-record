# js-record

A TypeScript ORM inspired by Ruby's ActiveRecord, designed for PostgreSQL and other databases.

## Features

- **ActiveRecord Pattern**: Models inherit from a base class, combining data access and business logic
- **Type Safety**: Full TypeScript support with compile-time type checking
- **Database Agnostic**: Adapter pattern allows support for multiple databases
- **Query Builder**: Fluent, chainable query interface
- **Associations**: Support for belongsTo, hasOne, hasMany, and many-to-many relationships
- **Transactions**: Full ACID transaction support
- **Schema Introspection**: Inspect database schema at runtime

## Installation

```bash
npm install js-record pg
# or
yarn add js-record pg
```

## Quick Start

### Setting Up a Database Connection

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

### Defining Models

```typescript
import { Model } from 'js-record';

class User extends Model {
  id!: number;
  name!: string;
  email!: string;
  created_at!: Date;
  updated_at!: Date;
}

class Post extends Model {
  id!: number;
  user_id!: number;
  title!: string;
  content!: string;
  published!: boolean;
  created_at!: Date;
  updated_at!: Date;
}

// Set the database adapter for all models
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
const activeUsers = await User.where({ active: true })
  .orderBy('created_at', 'DESC')
  .limit(10)
  .all();

// Complex queries
const posts = await Post.where('published = ?', true)
  .where('created_at > ?', thirtyDaysAgo)
  .orderBy('views', 'DESC')
  .all();

// Counting
const count = await User.where({ active: true }).count();

// Existence check
const exists = await User.where({ email: 'john@example.com' }).exists();
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
  foreignKey: 'post_id',
  throughForeignKey: 'tag_id',
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

### Transactions

```typescript
const transaction = await adapter.beginTransaction();
try {
  await transaction.execute('INSERT INTO users (name) VALUES ($1)', ['Alice']);
  await transaction.execute('INSERT INTO profiles (user_id) VALUES ($1)', [1]);
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

### Planned

- 📋 Eager loading (includes)
- 📋 Validations
- 📋 Callbacks/Hooks
- 📋 Migrations
- 📋 Scopes
- 📋 Additional database adapters (MySQL, SQLite)

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Watch mode for development
npm run build:watch

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

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

- PostgreSQL

Planned:

- MySQL
- SQLite
- SQL Server

## Contributing

This is an open-source project. Contributions are welcome!

## License

MIT
