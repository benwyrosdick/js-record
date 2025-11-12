/**
 * Example usage of callbacks/hooks
 * Demonstrates lifecycle hooks and callback patterns
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

// Model with instance method callbacks
class Article extends Model {
  id!: number;
  title!: string;
  slug?: string;
  content!: string;
  publishedAt?: Date;
  viewCount!: number;
  createdAt!: Date;
  updatedAt!: Date;

  // Instance method callbacks - automatically called
  beforeSave() {
    console.log('beforeSave: Generating slug...');
    if (!this.slug && this.title) {
      this.slug = this.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
  }

  afterSave() {
    console.log(`afterSave: Article saved with ID ${this.id}`);
  }

  beforeCreate() {
    console.log('beforeCreate: Initializing view count...');
    if (!this.viewCount) {
      this.viewCount = 0;
    }
  }

  afterCreate() {
    console.log('afterCreate: Article created successfully!');
    // Could send notification, log to analytics, etc.
  }

  beforeUpdate() {
    console.log('beforeUpdate: Checking for changes...');
  }

  afterUpdate() {
    console.log('afterUpdate: Article updated!');
  }

  beforeDestroy() {
    console.log('beforeDestroy: About to delete article...');
    // Could archive the article, log deletion, etc.
  }

  afterDestroy() {
    console.log('afterDestroy: Article deleted successfully');
  }

  // Callback that halts the chain
  beforeValidation() {
    if (this.title && this.title.includes('SPAM')) {
      console.log('beforeValidation: Blocking spam content!');
      return false; // This will halt the validation chain
    }
  }
}

// Model with class-level callbacks
class User extends Model {
  id!: number;
  email!: string;
  password?: string;
  passwordHash?: string;
  resetToken?: string;
  createdAt!: Date;
  updatedAt!: Date;
}

// Register class-level callbacks
User.beforeCreate('hashPassword');
User.afterCreate('sendWelcomeEmail');
User.beforeUpdate('generateResetToken', {
  if: (model: Model) => {
    const user = model as User;
    return user.hasChanges() && user.getChanges().password !== undefined;
  },
});

// Add callback methods to User
(User.prototype as any).hashPassword = function () {
  console.log('Hashing password...');
  if (this.password) {
    // In real app, use bcrypt
    this.passwordHash = `hashed_${this.password}`;
    this.password = undefined; // Clear plain password
  }
};

(User.prototype as any).sendWelcomeEmail = async function () {
  console.log(`Sending welcome email to ${this.email}`);
  // Simulate email sending
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('Welcome email sent!');
};

(User.prototype as any).generateResetToken = function () {
  console.log('Generating password reset token...');
  this.resetToken = Math.random().toString(36).substring(7);
};

// Model with conditional callbacks
class Post extends Model {
  id!: number;
  title!: string;
  status!: string;
  publishedAt?: Date;
  notificationSent!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

// Conditional callback - only runs for published posts
Post.afterCreate(
  async (model: Model) => {
    const post = model as Post;
    console.log('Sending publication notifications...');
    post.notificationSent = true;
    post.publishedAt = new Date();
    // In real app: send emails, push notifications, etc.
  },
  {
    if: (model: Model) => (model as Post).status === 'published',
  }
);

// Conditional callback with unless
Post.beforeUpdate(
  () => {
    console.log('Validating published post changes...');
    // Additional validation for published posts
  },
  {
    unless: (model: Model) => (model as Post).status === 'draft',
  }
);

async function demonstrateCallbacks() {
  try {
    await adapter.connect();
    console.log('=== Callback Examples ===\n');

    // Example 1: Basic callbacks
    console.log('1. Creating an article (watch the callback chain):');
    const article = new Article();
    article.title = 'My First Article';
    article.content = 'This is the content of my first article.';
    await article.save({ validate: false });
    console.log('Generated slug:', article.slug);
    console.log();

    // Example 2: Update callbacks
    console.log('2. Updating an article:');
    article.title = 'My Updated Article';
    await article.save({ validate: false });
    console.log();

    // Example 3: Destroy callbacks
    console.log('3. Destroying an article:');
    await article.destroy();
    console.log();

    // Example 4: Halting callback chain
    console.log('4. Halting callback chain with spam content:');
    const spamArticle = new Article();
    spamArticle.title = 'SPAM: Buy now!';
    spamArticle.content = 'Spam content';
    const saved = await spamArticle.save();
    console.log('Was spam article saved?', saved);
    console.log();

    // Example 5: Class-level callbacks
    console.log('5. User creation with class-level callbacks:');
    const user = new User();
    user.email = 'user@example.com';
    user.password = 'mysecretpassword';
    await user.save({ validate: false });
    console.log('Password hash:', user.passwordHash);
    console.log('Plain password cleared:', user.password);
    console.log();

    // Example 6: Conditional callbacks
    console.log('6. Conditional callbacks for published posts:');
    const publishedPost = new Post();
    publishedPost.title = 'Published Post';
    publishedPost.status = 'published';
    publishedPost.notificationSent = false;
    await publishedPost.save({ validate: false });
    console.log('Notification sent?', publishedPost.notificationSent);
    console.log('Published at:', publishedPost.publishedAt);
    console.log();

    console.log('7. Draft post (no notification):');
    const draftPost = new Post();
    draftPost.title = 'Draft Post';
    draftPost.status = 'draft';
    draftPost.notificationSent = false;
    await draftPost.save({ validate: false });
    console.log('Notification sent?', draftPost.notificationSent);
    console.log();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await adapter.disconnect();
  }
}

// Run the examples
demonstrateCallbacks();
