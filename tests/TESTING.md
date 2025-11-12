# Testing Guide

This guide explains how to test the ORM with a real PostgreSQL database.

## Prerequisites

You need a running PostgreSQL database. You can:

1. **Use an existing PostgreSQL installation**
2. **Run PostgreSQL with Docker:**
   ```bash
   docker run --name postgres-test -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=js_record_test -p 5432:5432 -d postgres:15
   ```

## Running the Connection Test

### Option 1: Using Default Configuration

The test script uses default values (localhost:5432, postgres/postgres) if no environment variables are set:

```bash
bun run test:connection
```

### Option 2: Using Environment Variables

Set environment variables before running:

```bash
DB_HOST=localhost \
DB_PORT=5432 \
DB_NAME=mydb \
DB_USER=myuser \
DB_PASSWORD=mypassword \
bun run test:connection
```

### Option 3: Using a .env File

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your database credentials:

   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=postgres
   ```

3. Install dotenv:

   ```bash
   bun install --save-dev dotenv
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
bun run test:connection

# Stop and remove container when done
docker stop postgres-test
docker rm postgres-test
```

## Testing Associations

The ORM supports four types of associations: `belongsTo`, `hasOne`, `hasMany`, and `hasManyThrough` (many-to-many).

### Setting Up the Test Database

**Good news!** The test script automatically creates all necessary tables when run. No manual setup is required!

If you prefer to create the tables manually, you can use the following SQL:

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table (one-to-one with users)
CREATE TABLE profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  avatar_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts table (one-to-many with users)
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tags table
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Post tags join table (many-to-many)
CREATE TABLE post_tags (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(post_id, tag_id)
);
```

### Running Association Tests

```bash
bun run test:associations
```

Or with custom database credentials:

```bash
DB_HOST=localhost \
DB_PORT=5432 \
DB_NAME=js_record_dev \
DB_USER=postgres \
DB_PASSWORD=postgres \
npx ts-node test-associations.ts
```

### What the Association Tests Cover

1. **BelongsTo** - Getting the owner of a record (e.g., post author)
2. **HasOne** - Getting a single associated record (e.g., user profile)
3. **HasMany** - Getting multiple associated records (e.g., user's posts)
   - Creating associated records
   - Counting associated records
   - Querying with conditions
4. **HasManyThrough** - Many-to-many relationships (e.g., posts and tags)
   - Adding associations
   - Removing associations
   - Querying through join tables

### Association API Examples

```typescript
// Define models
class User extends Model {}
class Profile extends Model {}
class Post extends Model {}
class Tag extends Model {}

// Define associations
User.hasOne('profile', Profile);
User.hasMany('posts', Post);
Post.belongsTo('user', User);
Post.hasManyThrough('tags', Tag, {
  through: 'post_tags',
  foreignKey: 'post_id',
  throughForeignKey: 'tag_id',
});

// Usage
const user = await User.find(1);

// HasOne
const profile = await user.profile;

// HasMany
const posts = await user.posts.all();
const publishedPosts = await user.posts.query().where({ published: true }).all();
const newPost = await user.posts.create({ title: 'New Post', content: '...' });

// BelongsTo
const post = await Post.find(1);
const author = await post.user;

// HasManyThrough
const tags = await post.tags.all();
await post.tags.add(tag1, tag2);
await post.tags.remove(tag1);
```
