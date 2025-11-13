#!/usr/bin/env node

/**
 * js-record CLI
 * Command-line interface for js-record ORM
 */

import { createMigration } from './migration-create';

const command = process.argv[2];
const args = process.argv.slice(3);

function showHelp(): void {
  console.log(`
js-record CLI - ActiveRecord-style ORM for TypeScript

Usage:
  js-record <command> [options]

Commands:
  migration:create [name]    Create a new migration file
  help                       Show this help message

Examples:
  js-record migration:create create_users_table
  js-record migration:create add_status_to_users
  js-record help

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
