/**
 * Example migration: Add slug column to posts
 */

import { Migration } from '../../src/migrations/Migration';

export default class AddSlugToPosts extends Migration {
  async up(): Promise<void> {
    await this.addColumn('posts', 'slug', 'VARCHAR(255)', {
      unique: true,
    });

    await this.createIndex('posts', ['slug']);
  }

  async down(): Promise<void> {
    await this.dropIndex('posts', 'posts_slug_index');
    await this.dropColumn('posts', 'slug');
  }
}
