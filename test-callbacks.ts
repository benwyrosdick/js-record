/**
 * Test callbacks/hooks functionality
 */

import { Model } from './src/core/Model';
import { PostgresAdapter } from './src/adapters/PostgresAdapter';

// Initialize database adapter
const adapter = new PostgresAdapter({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

Model.setAdapter(adapter);

// Track callback execution
const callbackLog: string[] = [];

// Setup database
async function setupDatabase() {
  console.log('=== Setting up database ===');

  try {
    await adapter.execute('DROP TABLE IF EXISTS articles CASCADE');

    await adapter.execute(`
      CREATE TABLE articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        slug VARCHAR(255),
        content TEXT,
        view_count INTEGER DEFAULT 0,
        published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Database tables created\n');
  } catch (error) {
    console.error('Failed to setup database:', error);
    throw error;
  }
}

// Model with callbacks
class Article extends Model {
  id!: number;
  title!: string;
  slug?: string;
  content!: string;
  view_count!: number;
  published!: boolean;
  created_at!: Date;
  updated_at!: Date;

  // Lifecycle method callbacks
  beforeValidation() {
    callbackLog.push('beforeValidation');
  }

  afterValidation() {
    callbackLog.push('afterValidation');
  }

  beforeSave() {
    callbackLog.push('beforeSave');
    // Generate slug from title
    if (!this.slug && this.title) {
      this.slug = this.title.toLowerCase().replace(/\s+/g, '-');
    }
  }

  afterSave() {
    callbackLog.push('afterSave');
  }

  beforeCreate() {
    callbackLog.push('beforeCreate');
  }

  afterCreate() {
    callbackLog.push('afterCreate');
    console.log(`Article created with ID: ${this.id}`);
  }

  beforeUpdate() {
    callbackLog.push('beforeUpdate');
  }

  afterUpdate() {
    callbackLog.push('afterUpdate');
    console.log(`Article updated: ${this.title}`);
  }

  beforeDestroy() {
    callbackLog.push('beforeDestroy');
    console.log(`About to destroy article: ${this.title}`);
  }

  afterDestroy() {
    callbackLog.push('afterDestroy');
    console.log('Article destroyed');
  }
}

// Register class-level callbacks
Article.beforeSave('logBeforeSave');
Article.afterCreate('incrementViewCount');

// Add methods referenced by callbacks
(Article.prototype as any).logBeforeSave = function () {
  console.log('Class-level beforeSave callback');
};

(Article.prototype as any).incrementViewCount = function () {
  console.log('Incrementing view count in afterCreate');
};

// Model with conditional callbacks
class Post extends Model {
  id!: number;
  title!: string;
  status!: string;
  notification_sent!: boolean;
  created_at!: Date;
  updated_at!: Date;
}

// Register conditional callbacks
Post.afterCreate(
  async (model: Model) => {
    const post = model as Post;
    if (post.status === 'published') {
      console.log('Conditional callback: Post published!');
      post.notification_sent = true;
    }
  },
  {
    if: (model: Model) => (model as Post).status === 'published',
  }
);

Post.beforeUpdate(
  () => {
    console.log('This should NOT execute for draft posts');
  },
  {
    unless: (model: Model) => (model as Post).status === 'draft',
  }
);

// Model that halts callback chain
class BlockedArticle extends Model {
  id!: number;
  title!: string;
  blocked!: boolean;
  created_at!: Date;
  updated_at!: Date;

  beforeSave(): boolean | void {
    if (this.blocked) {
      console.log('Save blocked by callback!');
      return false; // Halt the chain
    }
    return undefined;
  }
}

// Test functions
async function testBasicCallbacks() {
  console.log('=== Testing Basic Callbacks ===');
  callbackLog.length = 0;

  const article = new Article();
  article.title = 'My First Article';
  article.content = 'This is the content';

  const saved = await article.save({ validate: false });
  console.log('Saved?', saved);
  console.log('Generated slug:', article.slug);
  console.log('Callback execution order:', callbackLog);
  console.log();

  const expectedOrder = ['beforeSave', 'beforeCreate', 'afterCreate', 'afterSave'];

  const orderMatch = JSON.stringify(callbackLog) === JSON.stringify(expectedOrder);
  if (saved && orderMatch) {
    console.log('✓ Basic callbacks test passed\n');
  } else {
    throw new Error('Basic callbacks test failed');
  }

  return article;
}

async function testUpdateCallbacks(article: Article) {
  console.log('=== Testing Update Callbacks ===');
  callbackLog.length = 0;

  article.title = 'Updated Article';
  const saved = await article.save({ validate: false });
  console.log('Updated?', saved);
  console.log('Callback execution order:', callbackLog);
  console.log();

  // Without validation, we shouldn't see validation callbacks
  const expectedOrder = ['beforeSave', 'beforeUpdate', 'afterUpdate', 'afterSave'];

  const orderMatch = JSON.stringify(callbackLog) === JSON.stringify(expectedOrder);
  if (saved && orderMatch) {
    console.log('✓ Update callbacks test passed\n');
  } else {
    console.log('Expected:', expectedOrder);
    console.log('Got:', callbackLog);
    throw new Error('Update callbacks test failed');
  }
}

async function testDestroyCallbacks(article: Article) {
  console.log('=== Testing Destroy Callbacks ===');
  callbackLog.length = 0;

  const destroyed = await article.destroy();
  console.log('Destroyed?', destroyed);
  console.log('Callback execution order:', callbackLog);
  console.log();

  const expectedOrder = ['beforeDestroy', 'afterDestroy'];

  const orderMatch = JSON.stringify(callbackLog) === JSON.stringify(expectedOrder);
  if (destroyed && orderMatch) {
    console.log('✓ Destroy callbacks test passed\n');
  } else {
    throw new Error('Destroy callbacks test failed');
  }
}

async function testConditionalCallbacks() {
  console.log('=== Testing Conditional Callbacks ===');

  // Create posts table
  await adapter.execute('DROP TABLE IF EXISTS posts CASCADE');
  await adapter.execute(`
    CREATE TABLE posts (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255),
      status VARCHAR(50),
      notification_sent BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Test with published post
  const publishedPost = new Post();
  publishedPost.title = 'Published Post';
  publishedPost.status = 'published';
  await publishedPost.save({ validate: false });
  console.log('Published post notification sent?', publishedPost.notification_sent);

  // Test with draft post
  const draftPost = new Post();
  draftPost.title = 'Draft Post';
  draftPost.status = 'draft';
  await draftPost.save({ validate: false });
  console.log('Draft post notification sent?', draftPost.notification_sent);

  if (publishedPost.notification_sent && !draftPost.notification_sent) {
    console.log('✓ Conditional callbacks test passed\n');
  } else {
    throw new Error('Conditional callbacks test failed');
  }
}

async function testHaltingCallbacks() {
  console.log('=== Testing Halting Callbacks ===');

  // Create blocked_articles table
  await adapter.execute('DROP TABLE IF EXISTS blocked_articles CASCADE');
  await adapter.execute(`
    CREATE TABLE blocked_articles (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255),
      blocked BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Try to save blocked article
  const blockedArticle = new BlockedArticle();
  blockedArticle.title = 'Blocked Article';
  blockedArticle.blocked = true;

  const saved = await blockedArticle.save({ validate: false });
  console.log('Blocked article saved?', saved);

  if (!saved) {
    console.log('✓ Halting callbacks test passed\n');
  } else {
    throw new Error('Halting callbacks test failed - should not have saved');
  }

  // Now try with unblocked article
  const unblocked = new BlockedArticle();
  unblocked.title = 'Unblocked Article';
  unblocked.blocked = false;

  const savedUnblocked = await unblocked.save({ validate: false });
  console.log('Unblocked article saved?', savedUnblocked);

  if (savedUnblocked) {
    console.log('✓ Unblocked article saved successfully\n');
  } else {
    throw new Error('Unblocked article should have been saved');
  }
}

async function testCallbackOrder() {
  console.log('=== Testing Complete Callback Order (Create) ===');
  callbackLog.length = 0;

  const article = new Article();
  article.title = 'Test Order';
  article.content = 'Content';
  await article.save();

  console.log('Complete callback order:', callbackLog);

  const expectedOrder = [
    'beforeValidation',
    'afterValidation',
    'beforeSave',
    'beforeCreate',
    'afterCreate',
    'afterSave',
  ];

  const orderMatch = JSON.stringify(callbackLog) === JSON.stringify(expectedOrder);
  if (orderMatch) {
    console.log('✓ Callback order test passed\n');
  } else {
    console.log('Expected:', expectedOrder);
    console.log('Got:', callbackLog);
    throw new Error('Callback order test failed');
  }
}

async function cleanup() {
  console.log('=== Cleanup ===');
  await adapter.execute('DELETE FROM articles');
  await adapter.execute('DROP TABLE IF EXISTS posts CASCADE');
  await adapter.execute('DROP TABLE IF EXISTS blocked_articles CASCADE');
  console.log('Cleaned up all test data\n');
}

// Run tests
async function runTests() {
  try {
    await adapter.connect();
    console.log('Connected to database\n');

    await setupDatabase();

    let article = await testBasicCallbacks();
    await testUpdateCallbacks(article);
    await testDestroyCallbacks(article);
    await testConditionalCallbacks();
    await testHaltingCallbacks();
    await testCallbackOrder();

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
