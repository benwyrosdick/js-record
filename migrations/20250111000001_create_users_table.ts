/**
 * Example migration: Create users table
 */

import { Migration } from '../src/migrations/Migration';

export default class CreateUsersTable extends Migration {
  async up(): Promise<void> {
    await this.createTable('users', table => {
      table.increments('id');
      table.string('name').notNullable();
      table.string('email').unique().notNullable();
      table.string('password_hash');
      table.boolean('active').defaultTo(true);
      table.timestamps();
    });
  }

  async down(): Promise<void> {
    await this.dropTable('users');
  }
}
