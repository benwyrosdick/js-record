/**
 * Example migration: Create posts table with foreign key
 */

import { Migration } from '../../src/migrations/Migration';

export default class CreatePostsTable extends Migration {
  async up(): Promise<void> {
    await this.createTable('posts', table => {
      table.increments('id');
      table.integer('user_id').notNullable().references('id').on('users').onDelete('CASCADE');
      table.string('title').notNullable();
      table.text('content');
      table.boolean('published').defaultTo(false);
      table.timestamps();
    });

    // Add index on user_id
    await this.createIndex('posts', ['user_id']);
  }

  async down(): Promise<void> {
    await this.dropTable('posts');
  }
}
