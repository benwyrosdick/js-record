/**
 * Config initialization for CLI
 * Creates boilerplate database configuration files
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Create config directory and database configuration file
 */
export function createConfig(adapter: 'sqlite' | 'postgres' = 'sqlite'): void {
  const configDir = join(process.cwd(), 'config');
  const configPath = join(configDir, 'database.ts');

  // Check if config already exists
  if (existsSync(configPath)) {
    console.log('✗ Configuration file already exists:');
    console.log(`  ${configPath}`);
    console.log('');
    console.log('To recreate it, delete the existing file first.');
    process.exit(1);
  }

  // Create config directory if it doesn't exist
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
    console.log('✓ Created config directory');
  }

  // Generate config content based on adapter
  const configContent = generateConfigContent(adapter);

  // Write config file
  writeFileSync(configPath, configContent, 'utf8');

  console.log('✓ Created database configuration:');
  console.log(`  ${configPath}`);
  console.log('');
  console.log('Configuration created successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Review and update the configuration with your database details');
  console.log('2. Run migrations with: js-record migrate');
  console.log('3. Or create initial migration from existing schema: js-record migration:init');
}

/**
 * Generate configuration file content based on adapter type
 */
function generateConfigContent(adapter: 'sqlite' | 'postgres'): string {
  if (adapter === 'sqlite') {
    return `/**
 * Database Configuration
 * 
 * This file exports database configuration for js-record.
 * The CLI commands will automatically use this configuration.
 */

import { SqliteAdapter } from 'js-record';

// Database configuration
export const config = {
  adapter: 'sqlite',
  database: './database.db',
  filename: './database.db',
  
  // Alternative: in-memory database (for testing)
  // database: ':memory:',
  // filename: ':memory:',
};

// Export configured adapter
export const adapter = new SqliteAdapter(config);

// Export the adapter as default for convenience
export default adapter;
`;
  } else {
    return `/**
 * Database Configuration
 * 
 * This file exports database configuration for js-record.
 * The CLI commands will automatically use this configuration.
 */

import { PostgresAdapter } from 'js-record';

// Database configuration
export const config = {
  adapter: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'myapp_development',
  user: 'postgres',
  password: 'postgres',
  
  // Optional: SSL configuration
  // ssl: true,
  
  // Alternative: use connection string instead of individual params
  // connectionString: 'postgres://user:password@localhost:5432/myapp_development',
};

// Export configured adapter
export const adapter = new PostgresAdapter(config);

// Export the adapter as default for convenience
export default adapter;
`;
  }
}

/**
 * Initialize config with interactive prompt or argument
 */
export async function initConfig(args: string[]): Promise<void> {
  let adapter: 'sqlite' | 'postgres' = 'sqlite'; // default

  // Parse command line argument
  if (args[0]) {
    const arg = args[0].toLowerCase();
    if (arg === 'sqlite' || arg === 'postgres') {
      adapter = arg;
    } else {
      console.log('✗ Invalid adapter. Use "sqlite" or "postgres".');
      process.exit(1);
    }
  }

  console.log(`Initializing database configuration for ${adapter}...`);
  console.log('');

  createConfig(adapter);
}
