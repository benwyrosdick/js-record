/**
 * Test migrations functionality
 */

import { PostgresAdapter } from '../src/adapters/PostgresAdapter';
import { MigrationRunner } from '../src/migrations/MigrationRunner';

// Import migrations
import CreateUsersTable from './migrations/20250111000001_create_users_table';
import CreatePostsTable from './migrations/20250111000002_create_posts_table';
import AddSlugToPosts from './migrations/20250111000003_add_slug_to_posts';

// Initialize database adapter
const adapter = new PostgresAdapter({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Create migration runner
const runner = new MigrationRunner(adapter);

// Register migrations
const migrations = new Map<string, any>([
  ['20250111000001_create_users_table', CreateUsersTable],
  ['20250111000002_create_posts_table', CreatePostsTable],
  ['20250111000003_add_slug_to_posts', AddSlugToPosts],
]);

async function testMigrationUp() {
  console.log('=== Testing Migration Up ===\n');

  const ran = await runner.up(migrations);
  console.log(`\nRan ${ran.length} migration(s)`);

  if (ran.length > 0) {
    console.log('✓ Migration up test passed\n');
  } else {
    console.log('No migrations to run\n');
  }

  // Verify tables exist
  const usersExists = await adapter.tableExists('users');
  const postsExists = await adapter.tableExists('posts');

  console.log('Users table exists?', usersExists);
  console.log('Posts table exists?', postsExists);

  if (usersExists && postsExists) {
    console.log('✓ Tables created successfully\n');
  } else {
    throw new Error('Tables were not created');
  }
}

async function testMigrationStatus() {
  console.log('=== Testing Migration Status ===\n');

  const statuses = await runner.status(migrations);

  console.log('Migration Status:');
  for (const status of statuses) {
    const icon = status.migrated ? '✓' : '○';
    const batch = status.batch ? ` (batch ${status.batch})` : '';
    console.log(`${icon} ${status.name}${batch}`);
  }

  console.log('\n✓ Status check passed\n');
}

async function testTableOperations() {
  console.log('=== Testing Table Operations ===\n');

  // Check users table structure
  const usersInfo = await adapter.getTableInfo('users');
  console.log('Users table columns:', usersInfo.columns.map(c => c.name).join(', '));

  // Check posts table structure
  const postsInfo = await adapter.getTableInfo('posts');
  console.log('Posts table columns:', postsInfo.columns.map(c => c.name).join(', '));

  // Verify slug column was added
  const hasSlug = postsInfo.columns.some(c => c.name === 'slug');
  console.log('Posts table has slug column?', hasSlug);

  if (hasSlug) {
    console.log('✓ Table operations test passed\n');
  } else {
    throw new Error('Slug column not found');
  }
}

async function testDataOperations() {
  console.log('=== Testing Data Operations ===\n');

  // Insert a test user
  const insertUser = await adapter.query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
    ['Test User', 'test@example.com', 'hashed_password']
  );
  console.log('Created user:', insertUser.rows[0].name);

  // Insert a test post
  const insertPost = await adapter.query(
    'INSERT INTO posts (user_id, title, content, slug) VALUES ($1, $2, $3, $4) RETURNING *',
    [insertUser.rows[0].id, 'Test Post', 'This is a test post', 'test-post']
  );
  console.log('Created post:', insertPost.rows[0].title);

  // Query the data
  const users = await adapter.query('SELECT * FROM users');
  const posts = await adapter.query('SELECT * FROM posts');

  console.log(`Total users: ${users.rows.length}`);
  console.log(`Total posts: ${posts.rows.length}`);

  if (users.rows.length > 0 && posts.rows.length > 0) {
    console.log('✓ Data operations test passed\n');
  } else {
    throw new Error('Data operations failed');
  }
}

async function testRollback() {
  console.log('=== Testing Migration Rollback ===\n');

  // Rollback last batch
  const rolledBack = await runner.rollback(migrations, 1);
  console.log(`\nRolled back ${rolledBack.length} migration(s)`);

  if (rolledBack.length > 0) {
    console.log('✓ Rollback test passed\n');
  }

  // Check if slug column was removed
  const postsInfo = await adapter.getTableInfo('posts');
  const hasSlug = postsInfo.columns.some(c => c.name === 'slug');
  console.log('Posts table still has slug column?', hasSlug);

  if (!hasSlug) {
    console.log('✓ Slug column removed successfully\n');
  } else {
    throw new Error('Slug column was not removed');
  }
}

async function testRerun() {
  console.log('=== Testing Re-running Rolled Back Migration ===\n');

  // Run migrations again
  const ran = await runner.up(migrations);
  console.log(`\nRan ${ran.length} migration(s)`);

  if (ran.length > 0) {
    console.log('✓ Re-run test passed\n');
  }

  // Verify slug column is back
  const postsInfo = await adapter.getTableInfo('posts');
  const hasSlug = postsInfo.columns.some(c => c.name === 'slug');
  console.log('Posts table has slug column again?', hasSlug);

  if (hasSlug) {
    console.log('✓ Slug column re-added successfully\n');
  } else {
    throw new Error('Slug column not re-added');
  }
}

async function testReset() {
  console.log('=== Testing Migration Reset (Full Rollback) ===\n');

  // Reset all migrations
  const rolledBack = await runner.reset(migrations);
  console.log(`\nRolled back ${rolledBack.length} migration(s)`);

  if (rolledBack.length > 0) {
    console.log('✓ Reset test passed\n');
  }

  // Verify tables were dropped
  const usersExists = await adapter.tableExists('users');
  const postsExists = await adapter.tableExists('posts');

  console.log('Users table exists?', usersExists);
  console.log('Posts table exists?', postsExists);

  if (!usersExists && !postsExists) {
    console.log('✓ All tables dropped successfully\n');
  } else {
    throw new Error('Tables were not dropped');
  }
}

async function cleanup() {
  console.log('=== Cleanup ===');

  // Clean up migrations table
  await adapter.execute('DROP TABLE IF EXISTS migrations CASCADE');
  await adapter.execute('DROP TABLE IF EXISTS posts CASCADE');
  await adapter.execute('DROP TABLE IF EXISTS users CASCADE');

  console.log('Cleaned up all tables\n');
}

// Run tests
async function runTests() {
  try {
    await adapter.connect();
    console.log('Connected to database\n');

    // Initial cleanup
    await cleanup();

    // Run tests
    await testMigrationUp();
    await testMigrationStatus();
    await testTableOperations();
    await testDataOperations();
    await testRollback();
    await testRerun();
    await testReset();

    // Final cleanup
    await cleanup();

    console.log('=== All tests passed! ===');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await adapter.disconnect();
    console.log('\nDisconnected from database');
  }
}

runTests();
