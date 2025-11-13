# js-record CLI

The js-record CLI provides commands to help manage your database migrations and other ORM tasks.

## Installation

The CLI is included when you install js-record:

```bash
bun add js-record
# or
npm install js-record
```

## Usage

You can run the CLI in several ways:

### Using npx/bunx (Recommended for installed packages)

```bash
npx js-record <command> [options]
# or with bun
bunx js-record <command> [options]
```

### Using package.json scripts

Add scripts to your `package.json`:

```json
{
  "scripts": {
    "migration:create": "js-record migration:create"
  }
}
```

Then run:

```bash
bun run migration:create add_status_to_users
# or
npm run migration:create add_status_to_users
```

### Global installation

```bash
bun install -g js-record
# or
npm install -g js-record

# Then use directly
js-record migration:create create_users_table
```

## Configuration

Before running migrations, you need to configure your database connection.

### Option 1: Configuration File (Recommended)

Create a `js-record.config.js` file in your project root:

```javascript
module.exports = {
  adapter: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'myapp_dev',
  user: 'postgres',
  password: 'postgres',
};
```

For SQLite:

```javascript
module.exports = {
  adapter: 'sqlite',
  filename: './database.db',
};
```

### Option 2: Environment Variables

Set these environment variables:

```bash
# PostgreSQL
DB_ADAPTER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp_dev
DB_USER=postgres
DB_PASSWORD=postgres

# SQLite
DB_ADAPTER=sqlite
DB_FILENAME=./database.db
```

## Commands

### migration:create

Create a new migration file with a timestamp and proper structure.

**Usage:**

```bash
# With migration name
js-record migration:create create_users_table
js-record migration:create add_slug_to_posts

# Interactive mode (prompts for name)
js-record migration:create
```

See detailed documentation below.

### migration:init

Generate an initial migration from an existing database schema. This is useful when you're adding js-record to a project that already has a database with tables.

**Aliases:** `migration:init`, `migrate:init`, `init`

**Usage:**

```bash
js-record migration:init
```

**What it does:**

1. Connects to your database using your configuration
2. Introspects all tables (except the `migrations` tracking table)
3. Generates SQL CREATE TABLE statements for each table
4. Creates a migration file with all the schema as raw SQL
5. Includes proper `down()` method to drop all tables

**Example output:**

```
Loading database configuration...
Connecting to postgres database...
Retrieving database schema...

Found 3 table(s): users, posts, comments

Dumping schema for table: users
Dumping schema for table: posts
Dumping schema for table: comments

✓ Schema dump complete

Creating initial migration...

✓ Created migration: 20250112120000_initial_schema.ts
  Location: /path/to/project/migrations/20250112120000_initial_schema.ts

This migration contains the current database schema.
You can now track future changes with additional migrations.

Note: The migrations table was excluded from the dump.
```

**Generated migration structure:**

```typescript
import { Migration } from 'js-record';

export default class InitialSchema extends Migration {
  async up(): Promise<void> {
    // Execute the schema SQL
    const sql = `
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        CONSTRAINT fk_user FOREIGN KEY (user_id) 
          REFERENCES users(id) ON DELETE CASCADE
      );
      
      CREATE INDEX posts_user_id_index ON posts (user_id);
    `;

    // Split and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      await this.raw(statement);
    }
  }

  async down(): Promise<void> {
    await this.dropTable('posts');
    await this.dropTable('users');
  }
}
```

**Use cases:**

- **Existing project**: You have an existing database and want to start using js-record migrations
- **Database first**: Your database schema was created outside of migrations (manual SQL, GUI tools, etc.)
- **Migration from another ORM**: You're migrating from another framework and need to capture the current state
- **Team onboarding**: Create a baseline migration so new developers can set up the database quickly

**Important notes:**

- This command only captures the structure, not the data
- The `migrations` table is automatically excluded
- Review the generated migration before running it
- The `down()` method will drop ALL tables - use with caution!
- After running this, all future schema changes should be done through new migrations

### migration:create (detailed)

Create a new migration file with a timestamp and proper structure.

**Aliases:** `migrate:create`, `g:migration`

**Usage:**

```bash
# With migration name
js-record migration:create create_users_table
js-record migration:create add_slug_to_posts

# Interactive mode (prompts for name)
js-record migration:create
```

**What it does:**

1. Prompts for a migration name if not provided
2. Converts the name to snake_case for the filename
3. Generates a timestamp (YYYYMMDDHHMMSS)
4. Creates a `migrations/` directory if it doesn't exist
5. Creates a migration file with the format: `{timestamp}_{name}.ts`
6. Populates the file with a template including:
   - Proper imports
   - PascalCase class name
   - `up()` method with examples
   - `down()` method with examples

**Example output:**

```
✓ Created migration: 20250112120000_create_users_table.ts
  Location: /path/to/project/migrations/20250112120000_create_users_table.ts

Next steps:
  1. Edit the migration file and add your schema changes
  2. Run migrations with your MigrationRunner
```

**Generated file structure:**

```typescript
/**
 * Migration: CreateUsersTable
 * Created: 2025-01-12T12:00:00.000Z
 */

import { Migration } from 'js-record';

export default class CreateUsersTable extends Migration {
  async up(): Promise<void> {
    // Add your migration code here
    // Example:
    // await this.createTable('table_name', table => {
    //   table.increments('id');
    //   table.string('name').notNullable();
    //   table.timestamps();
    // });
  }

  async down(): Promise<void> {
    // Add your rollback code here
    // Example:
    // await this.dropTable('table_name');
  }
}
```

### migrate / migrate:up

Run all pending migrations that haven't been executed yet.

**Aliases:** `migrate`, `migrate:up`, `up`

**Usage:**

```bash
js-record migrate
js-record migrate:up
```

**What it does:**

1. Connects to your database
2. Creates a `migrations` table if it doesn't exist (tracks which migrations have run)
3. Loads all migration files from `migrations/` directory
4. Runs any migrations that haven't been executed yet
5. Records each migration with a batch number

**Example output:**

```
Loading database configuration...
Connecting to postgres database...
Loading migrations...
Found 3 migration(s)

Running pending migrations...
Running migration: 20250112120000_create_users_table
✓ Migrated: 20250112120000_create_users_table
Running migration: 20250112120100_create_posts_table
✓ Migrated: 20250112120100_create_posts_table

✓ Successfully ran 2 migration(s)
```

### migrate:down

Rollback the last batch (or multiple batches) of migrations.

**Aliases:** `migrate:down`, `rollback`, `down`

**Usage:**

```bash
# Rollback the last batch
js-record migrate:down

# Rollback the last 2 batches
js-record migrate:down 2
```

**What it does:**

1. Connects to your database
2. Finds the most recent batch of migrations
3. Runs the `down()` method for each migration in reverse order
4. Removes the migration records from the tracking table

### migrate:status

Show the status of all migrations (which have run and which are pending).

**Aliases:** `migrate:status`, `status`

**Usage:**

```bash
js-record migrate:status
```

**Example output:**

```
Loading database configuration...
Connecting to postgres database...
Loading migrations...

Migration Status:

Status | Batch | Name
-------|-------|-----
  ✓    |   1   | 20250112120000_create_users_table
  ✓    |   1   | 20250112120100_create_posts_table
  ○    |   -   | 20250112120200_add_slug_to_posts

2 completed, 1 pending
```

### migrate:reset

Rollback ALL migrations. This will run the `down()` method for every migration that has been executed.

**Aliases:** `migrate:reset`, `reset`

**Usage:**

```bash
js-record migrate:reset
```

**Warning:** This will undo all migrations and may result in data loss. Use with caution!

### help

Show help information about available commands.

**Aliases:** `--help`, `-h`

**Usage:**

```bash
js-record help
js-record --help
js-record -h
```

## Examples

### Basic workflow

```bash
# 1. Create a new migration
npx js-record migration:create create_users_table

# 2. Edit the migration file
# migrations/20250112120000_create_users_table.ts

# 3. In your application code, run the migration
# See the Migration Runner documentation for details
```

### Multiple migrations

```bash
# Create multiple migrations in order
npx js-record migration:create create_users_table
npx js-record migration:create create_posts_table
npx js-record migration:create add_slug_to_posts
```

The timestamp ensures migrations run in the correct order.

### Integration with package.json

Add these helpful scripts to your `package.json`:

```json
{
  "scripts": {
    "db:migrate:create": "js-record migration:create",
    "db:migrate": "bun run scripts/migrate.ts",
    "db:rollback": "bun run scripts/rollback.ts"
  }
}
```

Then use:

```bash
bun run db:migrate:create create_users_table
bun run db:migrate
bun run db:rollback
```

## Migration File Naming

Migration files follow this naming convention:

```
{YYYYMMDDHHMMSS}_{description}.ts
```

- **Timestamp:** Ensures migrations run in chronological order
- **Description:** Snake_case description of what the migration does

**Good names:**

- `20250112120000_create_users_table.ts`
- `20250112120100_add_email_to_users.ts`
- `20250112120200_create_posts_table.ts`

**Bad names:**

- `migration1.ts` (no timestamp, unclear purpose)
- `users.ts` (no timestamp, unclear if creating/modifying)
- `CreateUsers.ts` (PascalCase in filename)

## Tips

1. **Be descriptive:** Use clear migration names that describe what they do
2. **One change per migration:** Keep migrations focused on a single task
3. **Always test rollbacks:** Make sure your `down()` method properly reverses the `up()` method
4. **Don't edit old migrations:** Create new migrations to modify existing schema
5. **Version control:** Commit migration files to your repository

## Troubleshooting

### Command not found

If you get `command not found: js-record`, try:

```bash
# Use npx/bunx instead
npx js-record migration:create

# Or install globally
bun install -g js-record
```

### Migration file already exists

The CLI prevents overwriting existing migrations. If you see this error:

```
Error: Migration file already exists: migrations/20250112120000_create_users.ts
```

Wait a second and try again (the timestamp will be different), or delete the existing file if it was created in error.

### Migrations directory

By default, migrations are created in `migrations/` relative to where you run the command. Make sure you're in your project root when running the CLI.

## Future Commands

Coming soon:

- `js-record migrate:up` - Run pending migrations
- `js-record migrate:down` - Rollback migrations
- `js-record migrate:status` - Show migration status
- `js-record migrate:reset` - Reset all migrations
- `js-record db:seed` - Seed the database

## Related Documentation

- [Migrations Guide](./MIGRATIONS.md) (coming soon)
- [Migration API Reference](../src/migrations/Migration.ts)
- [Quick Start](./QUICK-START-SQLITE.md)
