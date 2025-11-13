/**
 * Example js-record configuration file
 * Copy this file to js-record.config.js and update with your database credentials
 */

module.exports = {
  // Database adapter: 'postgres' or 'sqlite'
  adapter: 'postgres',

  // PostgreSQL configuration
  host: 'localhost',
  port: 5432,
  database: 'myapp_dev',
  user: 'postgres',
  password: 'postgres',

  // SQLite configuration (if using sqlite adapter)
  // adapter: 'sqlite',
  // filename: './database.db',
};
