# js-record

A TypeScript ORM inspired by Ruby's ActiveRecord, designed for PostgreSQL and other databases.

## Features

- **ActiveRecord Pattern**: Models inherit from a base class, combining data access and business logic
- **Type Safety**: Full TypeScript support with compile-time type checking
- **Database Agnostic**: Adapter pattern allows support for multiple databases
- **Query Builder**: Fluent, chainable query interface
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
  password: 'password'
});

await adapter.connect();
```

### Using the Adapter

```typescript
// Execute queries
const result = await adapter.query('SELECT * FROM users WHERE active = $1', [true]);
console.log(result.rows);

// Execute inserts with RETURNING
const insertResult = await adapter.execute(
  'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id',
  ['John Doe', 'john@example.com']
);

// Inspect database schema
const tableInfo = await adapter.getTableInfo('users');
console.log(tableInfo.columns);

// Use transactions
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

### In Progress
- 🔨 Query Builder
- 🔨 Base Model class
- 🔨 CRUD operations

### Planned
- 📋 Associations (hasMany, belongsTo, hasOne)
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
