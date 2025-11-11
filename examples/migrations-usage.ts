/**
 * Example usage of migrations
 * Demonstrates database schema management
 */

import { PostgresAdapter } from '../src/adapters/PostgresAdapter';
import { Migration } from '../src/migrations/Migration';
import { MigrationRunner } from '../src/migrations/MigrationRunner';

// Initialize the database adapter
const adapter = new PostgresAdapter({
  host: 'localhost',
  port: 5432,
  database: 'js_record_dev',
  user: 'postgres',
  password: 'postgres',
});

// Example Migration 1: Create users table
class CreateUsersTable extends Migration {
  async up(): Promise<void> {
    await this.createTable('users', table => {
      table.increments('id'); // Auto-incrementing primary key
      table.string('name').notNullable();
      table.string('email', 100).unique().notNullable();
      table.string('password_hash');
      table.boolean('active').defaultTo(true);
      table.string('role').defaultTo('user');
      table.timestamps(); // created_at, updated_at
    });

    console.log('Created users table');
  }

  async down(): Promise<void> {
    await this.dropTable('users');
    console.log('Dropped users table');
  }
}

// Example Migration 2: Create posts table with foreign key
class CreatePostsTable extends Migration {
  async up(): Promise<void> {
    await this.createTable('posts', table => {
      table.increments('id');
      table.integer('user_id').notNullable().references('id').on('users').onDelete('CASCADE');
      table.string('title', 255).notNullable();
      table.text('content');
      table.boolean('published').defaultTo(false);
      table.integer('views').defaultTo(0);
      table.timestamps();
    });

    // Add indexes
    await this.createIndex('posts', ['user_id']);
    await this.createIndex('posts', ['published']);

    console.log('Created posts table');
  }

  async down(): Promise<void> {
    await this.dropTable('posts');
    console.log('Dropped posts table');
  }
}

// Example Migration 3: Add column to existing table
class AddSlugToPosts extends Migration {
  async up(): Promise<void> {
    await this.addColumn('posts', 'slug', 'VARCHAR(255)', {
      unique: true,
    });

    await this.createIndex('posts', ['slug']);

    console.log('Added slug column to posts table');
  }

  async down(): Promise<void> {
    await this.dropIndex('posts', 'posts_slug_index');
    await this.dropColumn('posts', 'slug');

    console.log('Removed slug column from posts table');
  }
}

// Example Migration 4: Rename column
class RenameUserRole extends Migration {
  async up(): Promise<void> {
    await this.renameColumn('users', 'role', 'user_role');
    console.log('Renamed role column to user_role');
  }

  async down(): Promise<void> {
    await this.renameColumn('users', 'user_role', 'role');
    console.log('Renamed user_role column back to role');
  }
}

// Example Migration 5: Create join table (many-to-many)
class CreatePostTagsTable extends Migration {
  async up(): Promise<void> {
    // First create tags table
    await this.createTable('tags', table => {
      table.increments('id');
      table.string('name', 50).unique().notNullable();
      table.timestamps();
    });

    // Then create join table
    await this.createTable('post_tags', table => {
      table.integer('post_id').notNullable().references('id').on('posts').onDelete('CASCADE');
      table.integer('tag_id').notNullable().references('id').on('tags').onDelete('CASCADE');
    });

    // Create composite unique index
    await this.createIndex('post_tags', ['post_id', 'tag_id'], true);

    console.log('Created tags and post_tags tables');
  }

  async down(): Promise<void> {
    await this.dropTable('post_tags');
    await this.dropTable('tags');
    console.log('Dropped tags and post_tags tables');
  }
}

async function demonstrateMigrations() {
  try {
    await adapter.connect();
    console.log('=== Migration Examples ===\n');

    // Create migration runner
    const runner = new MigrationRunner(adapter);

    // Register migrations
    const migrations = new Map<string, any>([
      ['001_create_users_table', CreateUsersTable],
      ['002_create_posts_table', CreatePostsTable],
      ['003_add_slug_to_posts', AddSlugToPosts],
      ['004_rename_user_role', RenameUserRole],
      ['005_create_post_tags_table', CreatePostTagsTable],
    ]);

    // Example 1: Run all migrations
    console.log('1. Running all migrations:\n');
    const ran = await runner.up(migrations);
    console.log(`\n✓ Ran ${ran.length} migration(s)\n`);

    // Example 2: Check migration status
    console.log('2. Migration status:\n');
    const statuses = await runner.status(migrations);
    for (const status of statuses) {
      const icon = status.migrated ? '✓' : '○';
      const batch = status.batch ? ` (batch ${status.batch})` : '';
      console.log(`${icon} ${status.name}${batch}`);
    }
    console.log();

    // Example 3: Rollback last batch
    console.log('3. Rolling back last batch:\n');
    const rolledBack = await runner.rollback(migrations, 1);
    console.log(`\n✓ Rolled back ${rolledBack.length} migration(s)\n`);

    // Example 4: Re-run migrations
    console.log('4. Re-running migrations:\n');
    const reran = await runner.up(migrations);
    console.log(`\n✓ Ran ${reran.length} migration(s)\n`);

    // Example 5: Reset all migrations
    console.log('5. Resetting all migrations:\n');
    const resetCount = await runner.reset(migrations);
    console.log(`\n✓ Reset ${resetCount.length} migration(s)\n`);

    console.log('All examples completed!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await adapter.disconnect();
  }
}

// Run the examples
demonstrateMigrations();
