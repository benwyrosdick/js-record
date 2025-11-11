/**
 * Test associations functionality
 *
 * Before running this test, you need to set up the database:
 *
 * CREATE TABLE users (
 *   id SERIAL PRIMARY KEY,
 *   name VARCHAR(255) NOT NULL,
 *   email VARCHAR(255) UNIQUE NOT NULL,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 *
 * CREATE TABLE profiles (
 *   id SERIAL PRIMARY KEY,
 *   user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
 *   bio TEXT,
 *   avatar_url VARCHAR(255),
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 *
 * CREATE TABLE posts (
 *   id SERIAL PRIMARY KEY,
 *   user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
 *   title VARCHAR(255) NOT NULL,
 *   content TEXT,
 *   published BOOLEAN DEFAULT false,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 *
 * CREATE TABLE tags (
 *   id SERIAL PRIMARY KEY,
 *   name VARCHAR(100) UNIQUE NOT NULL,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 *
 * CREATE TABLE post_tags (
 *   id SERIAL PRIMARY KEY,
 *   post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
 *   tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
 *   UNIQUE(post_id, tag_id)
 * );
 */

import { Model } from './src/core/Model';
import { PostgresAdapter } from './src/adapters/PostgresAdapter';

// Initialize database adapter
const adapter = new PostgresAdapter({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'js_record_test',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

Model.setAdapter(adapter);

// Define models
class User extends Model {
  id!: number;
  name!: string;
  email!: string;
  created_at!: Date;
  updated_at!: Date;
}

class Profile extends Model {
  id!: number;
  user_id!: number;
  bio!: string;
  avatar_url?: string;
  created_at!: Date;
  updated_at!: Date;
}

class Post extends Model {
  id!: number;
  user_id!: number;
  title!: string;
  content!: string;
  published!: boolean;
  created_at!: Date;
  updated_at!: Date;
}

class Tag extends Model {
  id!: number;
  name!: string;
  created_at!: Date;
  updated_at!: Date;
}

// Define associations
User.hasOne('profile', Profile);
User.hasMany('posts', Post);

Profile.belongsTo('user', User);

Post.belongsTo('user', User);
Post.hasManyThrough('tags', Tag, {
  through: 'post_tags',
  foreignKey: 'post_id',
  throughForeignKey: 'tag_id',
});

Tag.hasManyThrough('posts', Post, {
  through: 'post_tags',
  foreignKey: 'tag_id',
  throughForeignKey: 'post_id',
});

// Setup function to create tables
async function setupDatabase() {
  console.log('=== Setting up database ===');

  try {
    // Drop existing tables
    await adapter.execute('DROP TABLE IF EXISTS post_tags CASCADE');
    await adapter.execute('DROP TABLE IF EXISTS tags CASCADE');
    await adapter.execute('DROP TABLE IF EXISTS posts CASCADE');
    await adapter.execute('DROP TABLE IF EXISTS profiles CASCADE');
    await adapter.execute('DROP TABLE IF EXISTS users CASCADE');

    // Create users table
    await adapter.execute(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create profiles table
    await adapter.execute(`
      CREATE TABLE profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        bio TEXT,
        avatar_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create posts table
    await adapter.execute(`
      CREATE TABLE posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create tags table
    await adapter.execute(`
      CREATE TABLE tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create post_tags join table
    await adapter.execute(`
      CREATE TABLE post_tags (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        UNIQUE(post_id, tag_id)
      )
    `);

    console.log('✓ Database tables created\n');
  } catch (error) {
    console.error('Failed to setup database:', error);
    throw error;
  }
}

// Test functions
async function testBelongsTo() {
  console.log('=== Testing BelongsTo ===');

  // Create a user
  const user = await User.create({
    name: 'John Doe',
    email: 'john@example.com',
  });
  console.log('Created user:', user.name);

  // Create a post for that user
  const post = await Post.create({
    user_id: user.id,
    title: 'My First Post',
    content: 'This is my first post content',
    published: true,
  });
  console.log('Created post:', post.title);

  // Get the user from the post (belongsTo)
  const author = await (post as any).user;
  console.log('Post author:', author?.name);
  console.log('✓ BelongsTo test passed\n');
}

async function testHasOne() {
  console.log('=== Testing HasOne ===');

  const user = await User.first();
  if (!user) {
    console.log('No user found, skipping hasOne test');
    return;
  }

  // Create a profile for the user
  await Profile.create({
    user_id: user.id,
    bio: 'Software developer and blogger',
    avatar_url: 'https://example.com/avatar.jpg',
  });
  console.log('Created profile for user:', user.name);

  // Get the profile from the user (hasOne)
  const userProfile = await (user as any).profile;
  console.log('User profile bio:', userProfile?.bio);
  console.log('✓ HasOne test passed\n');
}

async function testHasMany() {
  console.log('=== Testing HasMany ===');

  const user = await User.first();
  if (!user) {
    console.log('No user found, skipping hasMany test');
    return;
  }

  // Create multiple posts
  await (user as any).posts.create({
    title: 'Second Post',
    content: 'Content of second post',
    published: true,
  });

  await (user as any).posts.create({
    title: 'Third Post',
    content: 'Content of third post',
    published: false,
  });

  console.log('Created posts for user:', user.name);

  // Get all posts
  const allPosts = await (user as any).posts.all();
  console.log('Total posts:', allPosts.length);

  // Count published posts
  const publishedCount = await (user as any).posts.query().where({ published: true }).count();
  console.log('Published posts:', publishedCount);

  // Get first post
  const firstPost = await (user as any).posts.first();
  console.log('First post:', firstPost?.title);

  console.log('✓ HasMany test passed\n');
}

async function testHasManyThrough() {
  console.log('=== Testing HasManyThrough ===');

  const post = await Post.first();
  if (!post) {
    console.log('No post found, skipping hasManyThrough test');
    return;
  }

  // Create tags
  const tag1 = await Tag.create({ name: 'JavaScript' });
  const tag2 = await Tag.create({ name: 'TypeScript' });
  const tag3 = await Tag.create({ name: 'Node.js' });

  console.log('Created tags');

  // Add tags to post
  await (post as any).tags.add(tag1, tag2, tag3);
  console.log('Added tags to post:', post.title);

  // Get all tags for the post
  const postTags = await (post as any).tags.all();
  console.log('Post tags:', postTags.map((t: Tag) => t.name).join(', '));

  // Get all posts with a specific tag
  const postsWithJsTag = await (tag1 as any).posts.all();
  console.log(`Posts tagged with "${tag1.name}":`, postsWithJsTag.length);

  // Remove a tag
  await (post as any).tags.remove(tag3);
  console.log('Removed one tag');

  const remainingTags = await (post as any).tags.all();
  console.log('Remaining tags:', remainingTags.map((t: Tag) => t.name).join(', '));

  console.log('✓ HasManyThrough test passed\n');
}

async function cleanup() {
  console.log('=== Cleanup ===');

  // Delete all test data
  await adapter.execute('DELETE FROM post_tags');
  await adapter.execute('DELETE FROM tags');
  await adapter.execute('DELETE FROM posts');
  await adapter.execute('DELETE FROM profiles');
  await adapter.execute('DELETE FROM users');

  console.log('Cleaned up all test data\n');
}

// Run tests
async function runTests() {
  try {
    await adapter.connect();
    console.log('Connected to database\n');

    // Setup database tables
    await setupDatabase();

    // Clean up any existing data
    await cleanup();

    // Run tests
    await testBelongsTo();
    await testHasOne();
    await testHasMany();
    await testHasManyThrough();

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
