/**
 * Migration generator
 * Creates a new migration file with proper naming and structure
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

export async function createMigration(name?: string): Promise<void> {
  let migrationName = name;

  // If no name provided, prompt for one
  if (!migrationName) {
    console.log('Enter migration name (e.g., create_users_table, add_slug_to_posts):');

    // Read from stdin
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    migrationName = await new Promise<string>(resolve => {
      rl.question('> ', (answer: string) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  if (!migrationName) {
    console.error('Error: Migration name is required');
    process.exit(1);
  }

  // Convert to snake_case if needed
  migrationName = migrationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  // Convert snake_case to PascalCase for class name
  const className = migrationName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  // Generate timestamp (YYYYMMDDHHMMSS)
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');

  // Create filename
  const filename = `${timestamp}_${migrationName}.ts`;

  // Use current working directory (where the command is run from)
  const migrationsDir = join(process.cwd(), 'migrations');

  // Create migrations directory if it doesn't exist
  if (!existsSync(migrationsDir)) {
    mkdirSync(migrationsDir, { recursive: true });
    console.log(`Created migrations directory: ${migrationsDir}`);
  }

  const filepath = join(migrationsDir, filename);

  // Check if file already exists
  if (existsSync(filepath)) {
    console.error(`Error: Migration file already exists: ${filepath}`);
    process.exit(1);
  }

  // Migration template
  const template = `/**
 * Migration: ${className}
 * Created: ${now.toISOString()}
 */

import { Migration } from 'js-record';

export default class ${className} extends Migration {
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
`;

  // Write the file
  writeFileSync(filepath, template, 'utf-8');

  console.log(`\n✓ Created migration: ${filename}`);
  console.log(`  Location: ${filepath}`);
  console.log('\nNext steps:');
  console.log('  1. Edit the migration file and add your schema changes');
  console.log('  2. Run migrations with your MigrationRunner');
  console.log();
}
