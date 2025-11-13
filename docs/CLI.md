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

## Commands

### migration:create

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
