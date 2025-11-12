# SQLite Support Added

## Summary

Added full SQLite database support using Bun's native SQLite driver. The SQLite adapter provides the same interface as PostgreSQL, allowing seamless switching between databases.

## New Files

### Core Implementation

- `src/adapters/SqliteAdapter.ts` - SQLite adapter implementation
  - File-based and in-memory database support
  - Full ACID transaction support
  - Schema introspection
  - Parameterized queries with `?` placeholders
  - Automatic foreign key enforcement

### Tests & Examples

- `test-sqlite.ts` - Comprehensive test suite covering all adapter features
- `examples/sqlite-usage.ts` - Basic SQLite usage examples
- `examples/multi-adapter-usage.ts` - Demonstrates adapter switching

### Documentation

- `docs/SQLITE.md` - Complete SQLite guide covering:
  - Configuration and setup
  - Data types and schema
  - Performance optimization
  - Transactions
  - Best practices
  - Migration from PostgreSQL

## Updated Files

### Source Code

- `src/adapters/index.ts` - Added SqliteAdapter export
- `src/index.ts` - Exports SqliteAdapter through adapters module

### Documentation

- `README.md` - Added SQLite quick start and database support section
- `package.json` - Updated description and keywords

### Build

- `package.json` - Added `test:sqlite` script
- `dist/` - Compiled TypeScript output includes SqliteAdapter

## Features

✅ **Connection Management**

- File-based databases: `{ database: './myapp.db' }`
- In-memory databases: `{ database: ':memory:' }`
- Automatic foreign key enforcement

✅ **CRUD Operations**

- Full Create, Read, Update, Delete support
- Parameterized queries with `?` placeholders
- Auto-increment primary keys

✅ **Transactions**

- BEGIN, COMMIT, ROLLBACK support
- Proper transaction isolation
- Rollback on errors

✅ **Schema Introspection**

- Table existence checks
- Column information retrieval
- Index information
- Primary key detection

✅ **Utility Operations**

- Truncate tables with autoincrement reset
- Drop tables
- Version information
- Table listing
- Connection health checks

## Usage Example

```typescript
import { SqliteAdapter } from 'js-record';

// Create adapter
const adapter = new SqliteAdapter({
  database: ':memory:',
});

// Connect
await adapter.connect();

// Create table
await adapter.execute(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  )
`);

// Insert data
const result = await adapter.execute('INSERT INTO users (name, email) VALUES (?, ?)', [
  'Alice',
  'alice@example.com',
]);

// Query data
const users = await adapter.query('SELECT * FROM users');

// Disconnect
await adapter.disconnect();
```

## Compatibility

- ✅ Bun native SQLite (bun:sqlite)
- ✅ Same Model interface as PostgreSQL
- ✅ Compatible with existing migration system
- ✅ Works with validations and callbacks

## Performance Characteristics

- **In-Memory**: Extremely fast for testing and temporary data
- **File-Based**: Good for small to medium applications
- **Concurrency**: Single writer, multiple readers (use WAL mode for better concurrency)
- **Transactions**: Full ACID compliance

## When to Use SQLite vs PostgreSQL

### Use SQLite for:

- Development and testing
- Embedded applications
- Small to medium applications
- Single-server deployments
- Read-heavy workloads with occasional writes

### Use PostgreSQL for:

- High-concurrency applications
- Multi-server deployments
- Complex queries and joins
- Large datasets (>100GB)
- Write-heavy workloads

## Testing

Run the test suite:

```bash
bun run test:sqlite
```

All 14 tests pass:

1. Connection establishment
2. Table creation
3. Table existence check
4. Schema introspection
5. Data insertion with auto-increment
6. Query operations
7. Parameterized queries
8. Update operations
9. Transaction commit
10. Transaction rollback
11. Table listing
12. Version information
13. Health checks
14. Truncate operations

## Migration Notes

If migrating from PostgreSQL:

- Change placeholder syntax from `$1, $2` to `?, ?`
- Adjust data types (SERIAL → INTEGER PRIMARY KEY AUTOINCREMENT)
- Store dates as TEXT in ISO 8601 format
- Store JSON as TEXT (parse/stringify manually)
- Boolean values stored as INTEGER (0/1)

See `docs/SQLITE.md` for detailed migration guide.

## Next Steps

Future enhancements:

- [ ] Connection pooling for file-based databases
- [ ] Backup/restore utilities
- [ ] Performance monitoring and query analysis
- [ ] Replication support
