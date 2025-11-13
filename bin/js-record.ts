#!/usr/bin/env node

/**
 * js-record CLI
 * Command-line interface for js-record ORM
 */

import { createMigration } from './migration-create';
import {
  runMigrations,
  rollbackMigrations,
  migrationStatus,
  resetMigrations,
} from './migration-runner';
import { initMigration } from './schema-dump';

const command = process.argv[2];
const args = process.argv.slice(3);

function showHelp(): void {
  console.log(`
js-record CLI - ActiveRecord-style ORM for TypeScript

Usage:
  js-record <command> [options]

Commands:
  migration:create [name]    Create a new migration file
  migration:init             Generate migration from existing database schema
  migrate                    Run pending migrations
  migrate:up                 Run pending migrations (alias)
  migrate:down [steps]       Rollback migrations (default: 1 batch)
  migrate:status             Show migration status
  migrate:reset              Rollback all migrations
  help                       Show this help message

Examples:
  js-record migration:create create_users_table
  js-record migration:init
  js-record migrate
  js-record migrate:down
  js-record migrate:down 2
  js-record migrate:status
  js-record migrate:reset

Database Configuration:
  Create a js-record.config.js file in your project root:
  
    module.exports = {
      adapter: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'myapp_dev',
      user: 'postgres',
      password: 'postgres'
    }
  
  Or use environment variables:
    DB_ADAPTER=postgres
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=myapp_dev
    DB_USER=postgres
    DB_PASSWORD=postgres

For more information, visit: https://github.com/benwyrosdick/js-record
`);
}

async function runCommand(): Promise<void> {
  switch (command) {
    case 'migration:create':
    case 'migrate:create':
    case 'g:migration':
      await createMigration(args[0]);
      break;

    case 'migration:init':
    case 'migrate:init':
    case 'init':
      await initMigration();
      break;

    case 'migrate':
    case 'migrate:up':
    case 'up':
      await runMigrations();
      break;

    case 'migrate:down':
    case 'rollback':
    case 'down': {
      const steps = args[0] ? parseInt(args[0]) : 1;
      await rollbackMigrations(steps);
      break;
    }

    case 'migrate:status':
    case 'status':
      await migrationStatus();
      break;

    case 'migrate:reset':
    case 'reset':
      await resetMigrations();
      break;

    case 'help':
    case '--help':
    case '-h':
    case undefined:
      showHelp();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run "js-record help" for usage information');
      process.exit(1);
  }
}

runCommand().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
