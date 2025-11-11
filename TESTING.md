# Testing the PostgreSQL Adapter

This guide explains how to test the PostgreSQL adapter with a real database.

## Prerequisites

You need a running PostgreSQL database. You can:

1. **Use an existing PostgreSQL installation**
2. **Run PostgreSQL with Docker:**
   ```bash
   docker run --name postgres-test -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
   ```

## Running the Connection Test

### Option 1: Using Default Configuration

The test script uses default values (localhost:5432, postgres/postgres) if no environment variables are set:

```bash
npm run test:connection
```

### Option 2: Using Environment Variables

Set environment variables before running:

```bash
PGHOST=localhost \
PGPORT=5432 \
PGDATABASE=mydb \
PGUSER=myuser \
PGPASSWORD=mypassword \
npm run test:connection
```

### Option 3: Using a .env File

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your database credentials:
   ```
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=postgres
   PGUSER=postgres
   PGPASSWORD=postgres
   ```

3. Install dotenv:
   ```bash
   npm install --save-dev dotenv
   ```

4. Run with dotenv:
   ```bash
   node -r dotenv/config -r ts-node/register test-connection.ts
   ```

## What the Test Does

The connection test script performs the following operations:

1. ✅ **Connect** - Establishes connection to PostgreSQL
2. ✅ **Ping** - Verifies connection is alive
3. ✅ **Get Version** - Retrieves PostgreSQL version
4. ✅ **List Tables** - Gets all tables in the database
5. ✅ **Create Table** - Creates a test table with various column types
6. ✅ **Table Exists** - Checks if table exists
7. ✅ **Get Table Info** - Retrieves schema information (columns, indexes)
8. ✅ **Insert Data** - Inserts a test record with RETURNING clause
9. ✅ **Query Data** - Queries data with parameterized queries
10. ✅ **Update Data** - Updates a record
11. ✅ **Transaction** - Tests transaction commit/rollback
12. ✅ **Count Records** - Counts total records
13. ✅ **Placeholder Conversion** - Tests ? to $1 conversion
14. ✅ **Identifier Escaping** - Tests identifier escaping
15. ✅ **Cleanup** - Drops the test table
16. ✅ **Disconnect** - Closes database connection

## Expected Output

```
🔌 Testing PostgreSQL Adapter Connection...

📋 Configuration:
   Host: localhost
   Port: 5432
   Database: postgres
   User: postgres
   Password: ********

1️⃣  Testing connection...
   ✅ Connected successfully!

2️⃣  Testing ping...
   ✅ Ping successful: true

3️⃣  Getting PostgreSQL version...
   ✅ Version: PostgreSQL 15.x on ...

...

✨ All tests passed successfully!

👋 Disconnected from database
```

## Troubleshooting

### Connection Refused

If you see `Error: connect ECONNREFUSED 127.0.0.1:5432`:
- Make sure PostgreSQL is running
- Check the host and port are correct
- Verify firewall settings

### Authentication Failed

If you see `password authentication failed`:
- Verify username and password are correct
- Check PostgreSQL's `pg_hba.conf` authentication settings

### Database Does Not Exist

If you see `database "xxx" does not exist`:
- Create the database first: `createdb mydb`
- Or use an existing database like `postgres`

## Running with Docker

Quick start with Docker:

```bash
# Start PostgreSQL
docker run --name postgres-test \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15

# Wait a few seconds for PostgreSQL to start
sleep 3

# Run the test
npm run test:connection

# Stop and remove container when done
docker stop postgres-test
docker rm postgres-test
```
