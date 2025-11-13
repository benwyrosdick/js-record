# CLI Usage Examples

This guide shows how to use the js-record CLI in your projects.

## Installation

First, install js-record in your project:

```bash
bun add js-record
# or
npm install js-record
```

## Creating Migrations

### Quick Start

```bash
# Create a migration with a name
npx js-record migration:create create_users_table

# Or use bunx with bun
bunx js-record migration:create create_users_table
```

### Interactive Mode

If you run the command without a name, it will prompt you:

```bash
$ npx js-record migration:create
Enter migration name (e.g., create_users_table, add_slug_to_posts):
> create_users_table

✓ Created migration: 20250112120000_create_users_table.ts
  Location: /path/to/project/migrations/20250112120000_create_users_table.ts
```

## Database Configuration

Before running migrations, create a `js-record.config.js` file in your project root:

```javascript
module.exports = {
  adapter: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'myapp_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};
```

Or for SQLite:

```javascript
module.exports = {
  adapter: 'sqlite',
  filename: './database.db',
};
```

## Recommended Setup

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "db:migrate:create": "js-record migration:create",
    "db:migrate": "js-record migrate",
    "db:migrate:down": "js-record migrate:down",
    "db:migrate:status": "js-record migrate:status",
    "db:migrate:reset": "js-record migrate:reset"
  }
}
```

Then use them:

```bash
# Create a migration
bun run db:migrate:create add_email_to_users

# Run migrations
bun run db:migrate

# Check status
bun run db:migrate:status

# Rollback last batch
bun run db:migrate:down

# Rollback last 2 batches
bun run db:migrate:down 2

# Reset all migrations
bun run db:migrate:reset
```

## How the Migration Tracking Works

js-record automatically creates a `migrations` table in your database to track which migrations have been run:

```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  batch INTEGER NOT NULL,
  migration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- **name**: The migration filename (e.g., `20250112120000_create_users_table`)
- **batch**: A number that groups migrations that ran together
- **migration_time**: When the migration was executed

When you run `js-record migrate`:

1. It checks which migrations are already in the `migrations` table
2. It runs only the pending migrations
3. Each new migration is recorded with the current batch number

When you run `js-record migrate:down`:

1. It finds the highest batch number
2. It runs the `down()` method for all migrations in that batch (in reverse order)
3. It removes those migrations from the tracking table

## Common Workflows

### Setting Up a New Project

```bash
# 1. Install js-record
bun add js-record

# 2. Create database config
cat > js-record.config.js << 'EOF'
module.exports = {
  adapter: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'myapp_dev',
  user: 'postgres',
  password: 'postgres',
};
EOF

# 3. Create your first migration
npx js-record migration:create create_users_table

# 4. Edit the migration file
# migrations/20250112120000_create_users_table.ts

# 5. Run the migration
npx js-record migrate

# 6. Check status
npx js-record migrate:status
```

### Creating a new table

```bash
# 1. Generate migration
npx js-record migration:create create_posts_table

# 2. Edit migrations/YYYYMMDDHHMMSS_create_posts_table.ts
# 3. Run migration
npx js-record migrate
```

### Adding a column

```bash
# 1. Generate migration
npx js-record migration:create add_published_at_to_posts

# 2. Edit migration file
# 3. Run migration
bun run db:migrate
```

### Complete Example with Multiple Migrations

```bash
# Set up a new project
mkdir my-app && cd my-app
bun init -y
bun add js-record

# Create database config
cat > js-record.config.js << 'EOF'
module.exports = {
  adapter: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'myapp_dev',
  user: 'postgres',
  password: 'postgres',
};
EOF

# Create your first migration
npx js-record migration:create create_users_table

# Edit the migration file
# migrations/20250112120000_create_users_table.ts

# Run the migration
npx js-record migrate
# Output:
# ✓ Migrated: 20250112120000_create_users_table
# ✓ Successfully ran 1 migration(s)

# Check status
npx js-record migrate:status
# Status | Batch | Name
# -------|-------|-----
#   ✓    |   1   | 20250112120000_create_users_table

# Create another migration
npx js-record migration:create create_posts_table

# Run migrations again
npx js-record migrate
# ✓ Migrated: 20250112120100_create_posts_table

# Oops, made a mistake? Rollback!
npx js-record migrate:down
# ✓ Rolled back: 20250112120100_create_posts_table

# Fix the migration and re-run
npx js-record migrate
# ✓ Migrated: 20250112120100_create_posts_table
```

## Tips

1. **Always use descriptive names**: `create_users_table` is better than `users`
2. **One task per migration**: Don't create and modify in the same migration
3. **Test your down() methods**: Always verify rollbacks work
4. **Version control**: Commit migration files to git
5. **Don't edit old migrations**: Create new ones instead
6. **Use environment variables**: Keep database credentials out of code

## Troubleshooting

### "command not found: js-record"

Make sure you're using `npx` or `bunx`:

```bash
npx js-record migration:create my_migration
```

Or install globally:

```bash
bun install -g js-record
```

### Migrations directory not found

The CLI creates `migrations/` in your current directory. Make sure you're in your project root.

### Import errors in migration files

Make sure js-record is installed:

```bash
bun add js-record
```

## Next Steps

- Read the [Migration API documentation](../src/migrations/Migration.ts)
- See [migrations-usage.ts](./migrations-usage.ts) for examples
- Check out the [CLI documentation](../docs/CLI.md)
