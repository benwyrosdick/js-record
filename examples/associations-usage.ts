/**
 * Example usage of associations
 * Demonstrates belongsTo, hasOne, hasMany, and hasManyThrough relationships
 */

import { Model } from '../src/core/Model';
import { PostgresAdapter } from '../src/adapters/PostgresAdapter';

// Initialize the database adapter
const adapter = new PostgresAdapter({
  host: 'localhost',
  port: 5432,
  database: 'js_record_dev',
  user: 'postgres',
  password: 'postgres',
});

Model.setAdapter(adapter);

// Define models

class User extends Model {
  id!: number;
  name!: string;
  email!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

class Profile extends Model {
  id!: number;
  userId!: number;
  bio!: string;
  avatarUrl?: string;
  createdAt!: Date;
  updatedAt!: Date;
}

class Post extends Model {
  id!: number;
  userId!: number;
  title!: string;
  content!: string;
  published!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

class Comment extends Model {
  id!: number;
  postId!: number;
  userId!: number;
  content!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

class Tag extends Model {
  id!: number;
  name!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

// PostTag join table (not used directly in associations, but defined for reference)
// class PostTag extends Model {
//   static config = {
//     tableName: 'post_tags',
//     timestamps: false,
//   };
//
//   id!: number;
//   postId!: number;
//   tagId!: number;
// }

// Define associations

// User has one Profile
User.hasOne('profile', Profile);

// User has many Posts
User.hasMany('posts', Post);

// User has many Comments
User.hasMany('comments', Comment);

// Profile belongs to User
Profile.belongsTo('user', User);

// Post belongs to User
Post.belongsTo('user', User);

// Post has many Comments
Post.hasMany('comments', Comment);

// Post has many Tags through PostTags (many-to-many)
Post.hasManyThrough('tags', Tag, {
  through: 'post_tags',
  foreignKey: 'postId',
  throughForeignKey: 'tagId',
});

// Tag has many Posts through PostTags (many-to-many)
Tag.hasManyThrough('posts', Post, {
  through: 'post_tags',
  foreignKey: 'tagId',
  throughForeignKey: 'postId',
});

// Comment belongs to Post
Comment.belongsTo('post', Post);

// Comment belongs to User
Comment.belongsTo('user', User);

// Example usage
async function demonstrateAssociations() {
  try {
    await adapter.connect();

    console.log('=== Association Examples ===\n');

    // 1. BelongsTo: Get the user of a post
    console.log('1. BelongsTo - Get the author of a post:');
    const post = await Post.find(1);
    if (post) {
      const author = await (post as any).user;
      console.log(`Post: "${post.title}"`);
      console.log(`Author: ${author?.name}\n`);
    }

    // 2. HasOne: Get user's profile
    console.log('2. HasOne - Get user profile:');
    const user = await User.find(1);
    if (user) {
      const profile = await (user as any).profile;
      console.log(`User: ${user.name}`);
      console.log(`Bio: ${profile?.bio}\n`);
    }

    // 3. HasMany: Get all posts by a user
    console.log('3. HasMany - Get all posts by a user:');
    if (user) {
      const posts = await (user as any).posts.all();
      console.log(`User: ${user.name}`);
      console.log(`Posts (${posts.length}):`);
      for (const p of posts) {
        console.log(`  - ${p.title}`);
      }
      console.log();
    }

    // 4. HasMany - Create a new post for a user
    console.log('4. HasMany - Create new post:');
    if (user) {
      const newPost = await (user as any).posts.create({
        title: 'My New Post',
        content: 'This is the content of my new post',
        published: false,
      });
      console.log(`Created post: "${newPost.title}"\n`);
    }

    // 5. HasMany - Count user's posts
    console.log('5. HasMany - Count posts:');
    if (user) {
      const postCount = await (user as any).posts.count();
      console.log(`${user.name} has ${postCount} posts\n`);
    }

    // 6. HasMany - Query with conditions
    console.log('6. HasMany - Get published posts:');
    if (user) {
      const publishedPosts = await (user as any).posts
        .query()
        .where({ published: true })
        .orderBy('created_at', 'DESC')
        .all();
      console.log(`Published posts: ${publishedPosts.length}\n`);
    }

    // 7. HasManyThrough - Get tags for a post (many-to-many)
    console.log('7. HasManyThrough - Get tags for a post:');
    if (post) {
      const tags = await (post as any).tags.all();
      console.log(`Post: "${post.title}"`);
      console.log(`Tags (${tags.length}):`);
      for (const tag of tags) {
        console.log(`  - ${tag.name}`);
      }
      console.log();
    }

    // 8. HasManyThrough - Add tags to a post
    console.log('8. HasManyThrough - Add tags to post:');
    if (post) {
      // Find or create tags
      let techTag = await Tag.findBy({ name: 'Technology' });
      if (!techTag) {
        techTag = await Tag.create({ name: 'Technology' });
      }

      let programmingTag = await Tag.findBy({ name: 'Programming' });
      if (!programmingTag) {
        programmingTag = await Tag.create({ name: 'Programming' });
      }

      // Add tags to post
      await (post as any).tags.add(techTag, programmingTag);
      console.log(`Added tags to post "${post.title}"\n`);
    }

    // 9. HasManyThrough - Get all posts with a specific tag
    console.log('9. HasManyThrough - Get posts with tag:');
    const techTag = await Tag.findBy({ name: 'Technology' });
    if (techTag) {
      const postsWithTag = await (techTag as any).posts.all();
      console.log(`Posts tagged with "${techTag.name}" (${postsWithTag.length}):`);
      for (const p of postsWithTag) {
        console.log(`  - ${p.title}`);
      }
      console.log();
    }

    // 10. Nested associations
    console.log('10. Nested associations - Post with author and comments:');
    const postWithAll = await Post.find(1);
    if (postWithAll) {
      const postAuthor = await (postWithAll as any).user;
      const postComments = await (postWithAll as any).comments.all();

      console.log(`Post: "${postWithAll.title}"`);
      console.log(`Author: ${postAuthor?.name}`);
      console.log(`Comments (${postComments.length}):`);

      for (const comment of postComments) {
        const commentAuthor = await (comment as any).user;
        console.log(`  - ${commentAuthor?.name}: ${comment.content.substring(0, 50)}...`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await adapter.disconnect();
  }
}

// Run the examples
demonstrateAssociations();
