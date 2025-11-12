# SQLite Adapter Guide

The SQLite adapter provides full support for SQLite databases using Bun's native SQLite driver. SQLite is perfect for development, testing, embedded applications, and small to medium-sized production applications.

## Features

- **Native Bun SQLite**: Uses Bun's built-in SQLite support (no external dependencies)
- **File-based or In-Memory**: Choose between persistent or ephemeral databases
- **Full ACID Compliance**: Complete transaction support
- **Zero Configuration**: No server setup required
- **Schema Introspection**: Full support for reading database metadata
- **High Performance**: Direct C binding through Bun

## Quick Start

### Installation

SQLite support is included with js-record - no additional dependencies needed when using Bun.

### Basic Setup

```typescript
import { SqliteAdapter } from 'js-record';

// File-based database (persistent)
const adapter = new SqliteAdapter({
  database: './myapp.db',
});

await adapter.connect();
```

### In-Memory Database

Perfect for testing:

```typescript
const adapter = new SqliteAdapter({
  database: ':memory:',
});

await adapter.connect();
```

## Configuration Options

```typescript
interface ConnectionConfig {
  database: string; // File path or ':memory:'
}
```

### Examples

```typescript
// Development database
const devAdapter = new SqliteAdapter({
  database: './dev.db',
});

// Test database (in-memory)
const testAdapter = new SqliteAdapter({
  database: ':memory:',
});

// Production database
const prodAdapter = new SqliteAdapter({
  database: '/var/data/production.db',
});
```

## Data Types

SQLite uses dynamic typing with the following storage classes:

| SQLite Type | JavaScript Type   | Usage                             |
| ----------- | ----------------- | --------------------------------- |
| INTEGER     | number/bigint     | Whole numbers, auto-increment IDs |
| REAL        | number            | Floating point numbers            |
| TEXT        | string            | Strings, dates (ISO 8601)         |
| BLOB        | Buffer/Uint8Array | Binary data                       |
| NULL        | null              | Null values                       |

### Type Affinity

SQLite automatically converts between types when possible:

```typescript
// Integer primary keys
id INTEGER PRIMARY KEY AUTOINCREMENT

// Text fields
name TEXT NOT NULL
email TEXT UNIQUE

// Numeric fields
price REAL
age INTEGER

// Dates (stored as TEXT)
created_at TEXT DEFAULT CURRENT_TIMESTAMP

// Boolean (stored as INTEGER 0/1)
is_active INTEGER DEFAULT 1

// JSON (stored as TEXT)
metadata TEXT
```

## Schema Definition

### Creating Tables

```typescript
await adapter.execute(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    age INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);
```

### Indexes

```typescript
// Create an index
await adapter.execute(`
  CREATE INDEX idx_users_email ON users(email)
`);

// Unique index
await adapter.execute(`
  CREATE UNIQUE INDEX idx_users_username ON users(username)
`);

// Composite index
await adapter.execute(`
  CREATE INDEX idx_posts_user_created 
  ON posts(user_id, created_at)
`);
```

### Foreign Keys

SQLite supports foreign keys (enabled by default in this adapter):

```typescript
await adapter.execute(`
  CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
  )
`);
```

## Transactions

SQLite provides full ACID transactions:

```typescript
const tx = await adapter.beginTransaction();

try {
  await tx.execute('INSERT INTO users (name, email) VALUES (?, ?)', ['Alice', 'alice@example.com']);

  const result = await tx.query('SELECT last_insert_rowid() as id');
  const userId = result.rows[0].id;

  await tx.execute('INSERT INTO profiles (user_id, bio) VALUES (?, ?)', [
    userId,
    'Software developer',
  ]);

  await tx.commit();
} catch (error) {
  await tx.rollback();
  throw error;
}
```

## Parameterized Queries

Always use parameterized queries to prevent SQL injection:

```typescript
// ✅ Good - parameterized
const users = await adapter.query('SELECT * FROM users WHERE age > ? AND is_active = ?', [18, 1]);

// ❌ Bad - string concatenation (vulnerable to SQL injection)
const users = await adapter.query(`SELECT * FROM users WHERE age > ${age}`);
```

## Performance Optimization

### 1. Use Transactions for Bulk Operations

```typescript
// Slow - individual inserts
for (const user of users) {
  await adapter.execute('INSERT INTO users (name, email) VALUES (?, ?)', [user.name, user.email]);
}

// Fast - batch with transaction
const tx = await adapter.beginTransaction();
try {
  for (const user of users) {
    await tx.execute('INSERT INTO users (name, email) VALUES (?, ?)', [user.name, user.email]);
  }
  await tx.commit();
} catch (error) {
  await tx.rollback();
  throw error;
}
```

### 2. Add Indexes

```typescript
// Analyze slow queries
await adapter.query('EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = ?', ['test@example.com']);

// Add index for frequently queried columns
await adapter.execute('CREATE INDEX idx_users_email ON users(email)');
```

### 3. Use PRAGMA Statements

```typescript
// Enable write-ahead logging (better concurrency)
await adapter.execute('PRAGMA journal_mode = WAL');

// Increase cache size (in pages, default is 2000)
await adapter.execute('PRAGMA cache_size = 10000');

// Set synchronous mode (faster but less safe)
await adapter.execute('PRAGMA synchronous = NORMAL');
```

## Common Operations

### Check Table Existence

```typescript
const exists = await adapter.tableExists('users');
```

### Get All Tables

```typescript
const tables = await adapter.getTables();
console.log(tables); // ['users', 'posts', 'comments']
```

### Get Table Schema

```typescript
const tableInfo = await adapter.getTableInfo('users');
console.log(tableInfo.columns);
console.log(tableInfo.indexes);
```

### Truncate Table

```typescript
await adapter.truncate('users');
```

### Drop Table

```typescript
await adapter.dropTable('users');
```

## Working with Dates

SQLite doesn't have a native date type. Store dates as TEXT in ISO 8601 format:

```typescript
// Insert with current timestamp
await adapter.execute(
  `
  INSERT INTO events (name, occurred_at) 
  VALUES (?, datetime('now'))
`,
  ['User Login']
);

// Query by date range
const events = await adapter.query(
  `
  SELECT * FROM events 
  WHERE occurred_at BETWEEN ? AND ?
`,
  ['2025-01-01', '2025-12-31']
);

// Format dates in queries
await adapter.query(`
  SELECT strftime('%Y-%m-%d', occurred_at) as date
  FROM events
`);
```

## Working with JSON

Store JSON data as TEXT:

```typescript
// Create table with JSON column
await adapter.execute(`
  CREATE TABLE settings (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    preferences TEXT  -- JSON data
  )
`);

// Insert JSON data
const prefs = { theme: 'dark', language: 'en' };
await adapter.execute('INSERT INTO settings (user_id, preferences) VALUES (?, ?)', [
  1,
  JSON.stringify(prefs),
]);

// Query JSON data
const result = await adapter.query('SELECT * FROM settings WHERE user_id = ?', [1]);
const preferences = JSON.parse(result.rows[0].preferences);
```

## Limitations

### 1. Concurrency

SQLite locks the entire database during writes:

- **Readers**: Multiple simultaneous readers are fine
- **Writers**: Only one writer at a time
- **Solution**: Use WAL mode for better concurrency

```typescript
await adapter.execute('PRAGMA journal_mode = WAL');
```

### 2. No Network Access

SQLite is file-based and doesn't support remote connections:

- ✅ Single-server applications
- ✅ Embedded applications
- ❌ Distributed systems
- ❌ High-traffic web applications with multiple servers

### 3. Data Type Flexibility

SQLite uses type affinity, not strict types:

```typescript
// This works but may cause issues
await adapter.execute(`
  INSERT INTO users (age) VALUES ('not a number')
`);
```

**Solution**: Use constraints and validation in your application.

### 4. No User Management

SQLite has no built-in user/permission system. File system permissions control access.

## Best Practices

### 1. Always Close Connections

```typescript
try {
  await adapter.connect();
  // ... operations ...
} finally {
  await adapter.disconnect();
}
```

### 2. Use Foreign Keys

```typescript
// Enable at connection (done automatically in this adapter)
await adapter.execute('PRAGMA foreign_keys = ON');
```

### 3. Regular Backups

```typescript
import { copyFileSync } from 'fs';

// Simple backup
copyFileSync('./myapp.db', './backup/myapp-backup.db');

// Or use SQLite backup API
await adapter.execute("VACUUM INTO '/path/to/backup.db'");
```

### 4. Analyze Query Performance

```typescript
const plan = await adapter.query('EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = ?', [
  'test@example.com',
]);
console.log(plan.rows);
```

## Testing

SQLite is perfect for testing due to in-memory databases:

```typescript
import { SqliteAdapter } from 'js-record';

describe('User Model', () => {
  let adapter: SqliteAdapter;

  beforeEach(async () => {
    // Fresh database for each test
    adapter = new SqliteAdapter({ database: ':memory:' });
    await adapter.connect();

    // Set up schema
    await adapter.execute(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE
      )
    `);
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  it('creates a user', async () => {
    const result = await adapter.execute('INSERT INTO users (name, email) VALUES (?, ?)', [
      'Alice',
      'alice@example.com',
    ]);

    expect(result.insertId).toBe(1);
  });
});
```

## Migration from PostgreSQL

### Data Type Mapping

| PostgreSQL        | SQLite                            |
| ----------------- | --------------------------------- |
| SERIAL, BIGSERIAL | INTEGER PRIMARY KEY AUTOINCREMENT |
| VARCHAR(n), TEXT  | TEXT                              |
| INTEGER, BIGINT   | INTEGER                           |
| DECIMAL, NUMERIC  | REAL                              |
| BOOLEAN           | INTEGER (0/1)                     |
| TIMESTAMP         | TEXT (ISO 8601)                   |
| JSON, JSONB       | TEXT                              |
| BYTEA             | BLOB                              |
| ARRAY             | TEXT (JSON serialized)            |

### Syntax Differences

```typescript
// PostgreSQL
'SELECT * FROM users WHERE created_at > NOW() - INTERVAL \'1 day\'';

// SQLite
'SELECT * FROM users WHERE created_at > datetime(\'now\', \'-1 day\')';

// PostgreSQL
'RETURNING id';

// SQLite
'SELECT last_insert_rowid() as id';

// PostgreSQL
'$1, $2, $3';

// SQLite
'?, ?, ?';
```

## Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Bun SQLite API](https://bun.sh/docs/api/sqlite)
- [SQLite Data Types](https://www.sqlite.org/datatype3.html)
- [SQLite Performance Tips](https://www.sqlite.org/speed.html)
