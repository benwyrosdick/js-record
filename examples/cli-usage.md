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

## Recommended Setup

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "db:migrate:create": "js-record migration:create",
    "db:migrate": "bun run scripts/migrate.ts",
    "db:rollback": "bun run scripts/rollback.ts",
    "db:reset": "bun run scripts/reset.ts"
  }
}
```

Then use them:

```bash
# Create a migration
bun run db:migrate:create add_email_to_users

# Run migrations
bun run db:migrate

# Rollback last migration
bun run db:rollback

# Reset all migrations
bun run db:reset
```

## Example Migration Scripts

### scripts/migrate.ts

```typescript
import { PostgresAdapter } from 'js-record';
import { MigrationRunner } from 'js-record';
import { readdirSync } from 'fs';
import { join } from 'path';

const adapter = new PostgresAdapter({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'myapp_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  await adapter.connect();

  const runner = new MigrationRunner(adapter);
  const migrationsDir = join(process.cwd(), 'migrations');

  // Load all migration files
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.ts'))
    .sort();

  const migrations = new Map();
  for (const file of files) {
    const name = file.replace('.ts', '');
    const migration = await import(join(migrationsDir, file));
    migrations.set(name, migration.default);
  }

  console.log('Running migrations...');
  const ran = await runner.up(migrations);

  if (ran.length > 0) {
    console.log(`✓ Ran ${ran.length} migration(s)`);
    ran.forEach(m => console.log(`  - ${m}`));
  } else {
    console.log('No pending migrations');
  }

  await adapter.disconnect();
}

migrate().catch(console.error);
```

### scripts/rollback.ts

```typescript
import { PostgresAdapter } from 'js-record';
import { MigrationRunner } from 'js-record';
import { readdirSync } from 'fs';
import { join } from 'path';

const adapter = new PostgresAdapter({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'myapp_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function rollback() {
  await adapter.connect();

  const runner = new MigrationRunner(adapter);
  const migrationsDir = join(process.cwd(), 'migrations');

  // Load all migration files
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.ts'))
    .sort();

  const migrations = new Map();
  for (const file of files) {
    const name = file.replace('.ts', '');
    const migration = await import(join(migrationsDir, file));
    migrations.set(name, migration.default);
  }

  console.log('Rolling back last batch...');
  const rolledBack = await runner.rollback(migrations, 1);

  if (rolledBack.length > 0) {
    console.log(`✓ Rolled back ${rolledBack.length} migration(s)`);
    rolledBack.forEach(m => console.log(`  - ${m}`));
  } else {
    console.log('No migrations to rollback');
  }

  await adapter.disconnect();
}

rollback().catch(console.error);
```

## Common Workflows

### Creating a new table

```bash
# 1. Generate migration
npx js-record migration:create create_posts_table

# 2. Edit migrations/YYYYMMDDHHMMSS_create_posts_table.ts
# 3. Run migration
bun run db:migrate
```

### Adding a column

```bash
# 1. Generate migration
npx js-record migration:create add_published_at_to_posts

# 2. Edit migration file
# 3. Run migration
bun run db:migrate
```

### Complete Example

```bash
# Set up a new project
mkdir my-app && cd my-app
bun init -y
bun add js-record

# Create migration scripts directory
mkdir scripts

# Add package.json scripts (see above)

# Create your first migration
npx js-record migration:create create_users_table

# Edit the migration file
# migrations/20250112120000_create_users_table.ts

# Run the migration
bun run db:migrate

# Create another migration
npx js-record migration:create create_posts_table

# Run migrations again
bun run db:migrate

# Oops, made a mistake? Rollback!
bun run db:rollback

# Fix the migration and re-run
bun run db:migrate
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
