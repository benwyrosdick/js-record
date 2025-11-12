# SQLite Quick Start Guide

Get started with SQLite in js-record in under 5 minutes!

## Installation

No additional dependencies needed - SQLite support is built into Bun!

```bash
bun add js-record
```

## Basic Setup (3 steps)

### 1. Create and Connect

```typescript
import { SqliteAdapter } from 'js-record';

const adapter = new SqliteAdapter({
  database: ':memory:', // or './myapp.db' for file-based
});

await adapter.connect();
```

### 2. Create a Table

```typescript
await adapter.execute(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    age INTEGER
  )
`);
```

### 3. Start Using It!

```typescript
// Insert
const result = await adapter.execute('INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
  'Alice',
  'alice@example.com',
  30,
]);
console.log('Inserted ID:', result.insertId);

// Query
const users = await adapter.query('SELECT * FROM users');
console.log('Users:', users.rows);

// Update
await adapter.execute('UPDATE users SET age = ? WHERE email = ?', [31, 'alice@example.com']);

// Delete
await adapter.execute('DELETE FROM users WHERE id = ?', [1]);
```

## With Models

```typescript
import { Model } from 'js-record';

// Set global adapter
Model.setAdapter(adapter);

// Define model
class User extends Model {
  static tableName = 'users';

  id!: number;
  name!: string;
  email!: string;
  age?: number;
}

// Use like ActiveRecord
const user = await User.create({
  name: 'Bob',
  email: 'bob@example.com',
  age: 25,
});

const foundUser = await User.find(1);
const allUsers = await User.all();

user.age = 26;
await user.save();

await user.destroy();
```

## Common Patterns

### In-Memory Database (Testing)

```typescript
const adapter = new SqliteAdapter({ database: ':memory:' });
```

**Use for:**

- Unit tests
- Integration tests
- Temporary data processing

### File-Based Database (Development/Production)

```typescript
const adapter = new SqliteAdapter({ database: './myapp.db' });
```

**Use for:**

- Local development
- Small applications
- Embedded applications
- Desktop applications

### Transactions

```typescript
const tx = await adapter.beginTransaction();

try {
  await tx.execute('INSERT INTO users (name, email) VALUES (?, ?)', ['Alice', 'alice@example.com']);
  await tx.execute('INSERT INTO profiles (user_id) VALUES (?)', [1]);
  await tx.commit();
} catch (error) {
  await tx.rollback();
  throw error;
}
```

### Environment-Based Setup

```typescript
const adapter = new SqliteAdapter({
  database: process.env.NODE_ENV === 'test' ? ':memory:' : './dev.db',
});
```

## Data Types Cheat Sheet

| JavaScript       | SQLite  | Example                       |
| ---------------- | ------- | ----------------------------- |
| number           | INTEGER | `age INTEGER`                 |
| number (decimal) | REAL    | `price REAL`                  |
| string           | TEXT    | `name TEXT`                   |
| boolean          | INTEGER | `is_active INTEGER` (0/1)     |
| Date             | TEXT    | `created_at TEXT` (ISO 8601)  |
| object           | TEXT    | `metadata TEXT` (JSON string) |
| Buffer           | BLOB    | `image BLOB`                  |

## Common SQL Commands

```sql
-- Create table with auto-increment ID
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE
);

-- Add index
CREATE INDEX idx_users_email ON users(email);

-- Foreign key
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert and get ID
INSERT INTO users (name, email) VALUES (?, ?);
SELECT last_insert_rowid();

-- Current timestamp
INSERT INTO events (name, occurred_at) VALUES (?, datetime('now'));

-- Date range query
SELECT * FROM events WHERE occurred_at BETWEEN ? AND ?;
```

## Tips & Tricks

### 1. Always Use Parameterized Queries

```typescript
// ✅ Good
await adapter.query('SELECT * FROM users WHERE id = ?', [userId]);

// ❌ Bad (SQL injection risk)
await adapter.query(`SELECT * FROM users WHERE id = ${userId}`);
```

### 2. Enable WAL Mode for Better Concurrency

```typescript
await adapter.execute('PRAGMA journal_mode = WAL');
```

### 3. Batch Inserts in Transactions

```typescript
const tx = await adapter.beginTransaction();
for (const user of users) {
  await tx.execute('INSERT INTO users (name, email) VALUES (?, ?)', [user.name, user.email]);
}
await tx.commit();
```

### 4. Check Table Before Creating

```typescript
const exists = await adapter.tableExists('users');
if (!exists) {
  await adapter.execute('CREATE TABLE users (...)');
}
```

### 5. Clean Up When Done

```typescript
try {
  await adapter.connect();
  // ... do work
} finally {
  await adapter.disconnect();
}
```

## Complete Example

```typescript
import { SqliteAdapter, Model } from 'js-record';

// 1. Setup
const adapter = new SqliteAdapter({ database: './app.db' });
await adapter.connect();
Model.setAdapter(adapter);

// 2. Define Model
class Todo extends Model {
  static tableName = 'todos';

  id!: number;
  title!: string;
  completed!: boolean;
}

// 3. Create Schema
await adapter.execute(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0
  )
`);

// 4. Use It
const todo = await Todo.create({
  title: 'Learn js-record',
  completed: false,
});

const todos = await Todo.all();
console.log(`You have ${todos.length} todos`);

todo.completed = true;
await todo.save();

await adapter.disconnect();
```

## Next Steps

- Read the [full SQLite guide](SQLITE.md) for advanced topics
- Check out [examples/sqlite-usage.ts](../examples/sqlite-usage.ts)
- Run the test suite: `bun run test:sqlite`
- Try [multi-adapter examples](../examples/multi-adapter-usage.ts)

## Common Issues

**Q: Database is locked**

```typescript
// Enable WAL mode
await adapter.execute('PRAGMA journal_mode = WAL');
```

**Q: Foreign keys not working**

```typescript
// Already enabled by default in this adapter
await adapter.execute('PRAGMA foreign_keys = ON');
```

**Q: How to view database file?**

```bash
# Install sqlite3 command line tool
sqlite3 myapp.db
# Then run SQL commands
.tables
.schema users
SELECT * FROM users;
```

**Q: How to backup database?**

```bash
# File copy
cp myapp.db backup.db

# Or use SQL
sqlite3 myapp.db "VACUUM INTO 'backup.db'"
```

## Resources

- [SQLite Official Docs](https://www.sqlite.org/docs.html)
- [Bun SQLite API](https://bun.sh/docs/api/sqlite)
- [SQL Tutorial](https://www.sqlitetutorial.net/)

---

**Ready to build?** Start coding with SQLite in js-record! 🚀
