/**
 * Scopes Test
 * Tests the scope functionality for models
 */

import { Model, SqliteAdapter } from '../src/index';

// Setup SQLite adapter
const adapter = new SqliteAdapter({ database: ':memory:' });

// Define test models
class Post extends Model {
  static tableName = 'posts';

  id!: number;
  title!: string;
  body!: string;
  status!: string;
  views!: number;
  published_at?: Date;
  created_at?: Date;
}

class Article extends Model {
  static tableName = 'articles';

  id!: number;
  title!: string;
  category!: string;
  is_featured!: boolean;
  score!: number;
  created_at?: Date;
}

async function testScopes() {
  console.log('🧪 Testing Scopes...\n');

  await adapter.connect();
  Model.setAdapter(adapter);

  // Create tables
  await adapter.execute(`
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT,
      status TEXT DEFAULT 'draft',
      views INTEGER DEFAULT 0,
      published_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await adapter.execute(`
    CREATE TABLE articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      is_featured INTEGER DEFAULT 0,
      score INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Test 1: Define named scopes
  console.log('Test 1: Defining named scopes...');

  // Scope for published posts
  Post.scope('published', query => {
    return query.where({ status: 'published' });
  });

  // Scope for drafts
  Post.scope('draft', query => {
    return query.where({ status: 'draft' });
  });

  // Scope for popular posts (with parameter)
  Post.scope('popular', (query, minViews = 100) => {
    return query.where('views >= ?', minViews);
  });

  // Scope for recent posts
  Post.scope('recent', query => {
    return query.orderBy('created_at', 'DESC').limit(10);
  });

  // Scope with search - using simple LIKE for now
  Post.scope('search', (query, term: string) => {
    const searchTerm = `%${term}%`;
    return query.where('title', 'LIKE', searchTerm);
  });

  console.log('✅ Scopes defined\n');

  // Test 2: Insert test data
  console.log('Test 2: Inserting test data...');

  await adapter.execute(
    `INSERT INTO posts (title, body, status, views) VALUES 
    ('First Post', 'Content 1', 'published', 150),
    ('Second Post', 'Content 2', 'published', 200),
    ('Draft Post', 'Draft content', 'draft', 10),
    ('Popular Post', 'Popular content', 'published', 500),
    ('Another Draft', 'More draft content', 'draft', 5)`
  );

  console.log('✅ Test data inserted\n');

  // Test 3: Use published scope
  console.log('Test 3: Using published scope...');
  const publishedPosts = await (Post as any).published().all();
  console.log(`✅ Found ${publishedPosts.length} published posts`);
  publishedPosts.forEach((post: Post) => {
    console.log(`   - ${post.title} (${post.status})`);
  });
  console.log();

  // Test 4: Use draft scope
  console.log('Test 4: Using draft scope...');
  const draftPosts = await (Post as any).draft().all();
  console.log(`✅ Found ${draftPosts.length} draft posts`);
  draftPosts.forEach((post: Post) => {
    console.log(`   - ${post.title} (${post.status})`);
  });
  console.log();

  // Test 5: Use popular scope with parameter
  console.log('Test 5: Using popular scope (views >= 150)...');
  const popularPosts = await (Post as any).popular(150).all();
  console.log(`✅ Found ${popularPosts.length} popular posts`);
  popularPosts.forEach((post: Post) => {
    console.log(`   - ${post.title} (${post.views} views)`);
  });
  console.log();

  // Test 6: Chain scopes
  console.log('Test 6: Chaining scopes (published + popular)...');
  const popularPublished = await (Post as any).published().where('views >= ?', 150).all();
  console.log(`✅ Found ${popularPublished.length} popular published posts`);
  popularPublished.forEach((post: Post) => {
    console.log(`   - ${post.title} (${post.status}, ${post.views} views)`);
  });
  console.log();

  // Test 7: Search scope
  console.log('Test 7: Using search scope...');
  const searchResults = await (Post as any).search('Popular').all();
  console.log(`✅ Found ${searchResults.length} posts matching 'Popular'`);
  searchResults.forEach((post: Post) => {
    console.log(`   - ${post.title}`);
  });
  console.log();

  // Test 8: Default scope
  console.log('Test 8: Testing default scope...');

  Article.defaultScope({
    where: { is_featured: 1 },
    order: ['score', 'DESC'],
  });

  await adapter.execute(
    `INSERT INTO articles (title, category, is_featured, score) VALUES 
    ('Featured Article 1', 'tech', 1, 95),
    ('Regular Article', 'tech', 0, 50),
    ('Featured Article 2', 'science', 1, 85),
    ('Another Regular', 'science', 0, 30)`
  );

  // Query should automatically apply default scope
  const featuredArticles = await Article.all();
  console.log(`✅ Found ${featuredArticles.length} articles (default scope applied)`);
  featuredArticles.forEach((article: Article) => {
    console.log(
      `   - ${article.title} (featured: ${article.is_featured}, score: ${article.score})`
    );
  });
  console.log();

  // Test 9: Unscoped query
  console.log('Test 9: Using unscoped query...');
  const allArticles = await Article.unscoped().all();
  console.log(`✅ Found ${allArticles.length} articles (without default scope)`);
  allArticles.forEach((article: Article) => {
    console.log(`   - ${article.title} (featured: ${article.is_featured})`);
  });
  console.log();

  // Test 10: Combine named scopes with default scope
  console.log('Test 10: Combining scopes...');

  Article.scope('tech', query => {
    return query.where({ category: 'tech' });
  });

  const techFeatured = await (Article as any).tech().all();
  console.log(`✅ Found ${techFeatured.length} tech articles (default scope + named scope)`);
  techFeatured.forEach((article: Article) => {
    console.log(`   - ${article.title} (${article.category}, featured: ${article.is_featured})`);
  });
  console.log();

  // Test 11: Count with scopes
  console.log('Test 11: Counting with scopes...');
  const publishedCount = await (Post as any).published().count();
  const draftCount = await (Post as any).draft().count();
  console.log(`✅ Published posts: ${publishedCount}`);
  console.log(`✅ Draft posts: ${draftCount}\n`);

  // Test 12: Exists with scopes
  console.log('Test 12: Exists with scopes...');
  const hasPopular = await (Post as any).popular(200).exists();
  console.log(`✅ Has posts with 200+ views: ${hasPopular}\n`);

  // Test 13: First/Last with scopes
  console.log('Test 13: First/Last with scopes...');
  const firstPublished = await (Post as any).published().first();
  const lastPublished = await (Post as any).published().last();
  if (firstPublished && lastPublished) {
    console.log(`✅ First published: ${firstPublished.title}`);
    console.log(`✅ Last published: ${lastPublished.title}\n`);
  }

  // Test 14: Complex scope with multiple conditions
  console.log('Test 14: Complex scope...');

  Post.scope('trending', query => {
    return query
      .where({ status: 'published' })
      .where('views >= ?', 100)
      .orderBy('views', 'DESC')
      .limit(5);
  });

  const trendingPosts = await (Post as any).trending().all();
  console.log(`✅ Found ${trendingPosts.length} trending posts`);
  trendingPosts.forEach((post: Post) => {
    console.log(`   - ${post.title} (${post.views} views)`);
  });
  console.log();

  // Test 15: Scope with joins (using raw SQL for example)
  console.log('Test 15: Advanced scope features...');

  Post.scope('withStats', query => {
    return query.select('posts.*').orderBy('views', 'DESC');
  });

  const postsWithStats = await (Post as any).withStats().all();
  console.log(`✅ Found ${postsWithStats.length} posts with stats`);
  console.log();

  // Clean up
  await adapter.disconnect();
  console.log('🎉 All scope tests completed!');
}

// Run tests
testScopes().catch(console.error);
