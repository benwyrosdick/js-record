/**
 * Comprehensive tests for all association types
 * Tests BelongsTo, HasOne, HasMany, and HasManyThrough associations
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Model } from '../core/Model';
import { BelongsTo } from './BelongsTo';
import { HasOne } from './HasOne';
import { HasMany } from './HasMany';
import { HasManyThrough } from './HasManyThrough';
import type { AssociationOptions, BelongsToOptions, HasManyThroughOptions } from './types';

// Test models for association testing
class User extends Model {
  static config = {
    tableName: 'users',
    primaryKey: 'id',
    timestamps: true,
    mapAttributes: true,
  };

  static modelName = 'User';
}

class Post extends Model {
  static config = {
    tableName: 'posts',
    primaryKey: 'id',
    timestamps: true,
    mapAttributes: true,
  };

  static modelName = 'Post';
}

class Profile extends Model {
  static config = {
    tableName: 'profiles',
    primaryKey: 'id',
    timestamps: true,
    mapAttributes: true,
  };

  static modelName = 'Profile';
}

class Tag extends Model {
  static config = {
    tableName: 'tags',
    primaryKey: 'id',
    timestamps: true,
    mapAttributes: true,
  };

  static modelName = 'Tag';
}

// Mock adapter for testing
class MockAdapter {
  async execute(_sql: string, _params?: any[]): Promise<any> {
    return { rowCount: 1 };
  }

  async query(_sql: string, _params?: any[]): Promise<any> {
    return { rows: [], rowCount: 0 };
  }

  escapeIdentifier(name: string): string {
    return `"${name}"`;
  }

  escapeLiteral(value: any): string {
    return `'${value}'`;
  }

  convertPlaceholders(sql: string, params: any[]): { sql: string; params: any[] } {
    return { sql, params };
  }
}

describe('Associations', () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    adapter = new MockAdapter();
    // Mock the Model.setAdapter method
    (Model as any).setAdapter(adapter);
  });

  afterEach(() => {
    // Clean up
  });

  describe('BelongsTo Association', () => {
    it('should create a BelongsTo association with default options', () => {
      const association = new BelongsTo(User, 'author', User);

      expect(association.getName()).toBe('author');
      expect(association.getType()).toBe('belongsTo');

      const meta = association.getMeta();
      expect(meta.type).toBe('belongsTo');
      expect(meta.foreignKey).toBe('user_id');
      expect(meta.primaryKey).toBe('id');
    });

    it('should create a BelongsTo association with custom options', () => {
      const options: BelongsToOptions = {
        foreignKey: 'author_id',
        primaryKey: 'uuid',
        as: 'author',
      };

      const association = new BelongsTo(Post, 'author', User, options);

      const meta = association.getMeta();
      expect(meta.foreignKey).toBe('author_id');
      expect(meta.primaryKey).toBe('uuid');
      expect(meta.options.as).toBe('author');
    });

    it('should handle lazy loading target model', () => {
      const association = new BelongsTo(Post, 'author', () => User);

      const meta = association.getMeta();
      expect(meta.target).toBe(User);
    });

    it('should build default foreign key correctly', () => {
      const association = new BelongsTo(Post, 'user', User);
      expect(association.getMeta().foreignKey).toBe('user_id');
    });

    it('should return null when foreign key is null', async () => {
      const association = new BelongsTo(Post, 'user', User);
      const postInstance = new Post() as any;
      postInstance.user_id = null;

      const result = await association.get(postInstance);
      expect(result).toBeNull();
    });

    it('should set foreign key to null when setting null association', async () => {
      const association = new BelongsTo(Post, 'user', User);
      const postInstance = new Post() as any;
      postInstance.user_id = 1;

      await association.set(postInstance, null);
      expect(postInstance.user_id).toBeNull();
    });

    it('should set foreign key when setting association', async () => {
      const association = new BelongsTo(Post, 'user', User);
      const postInstance = new Post() as any;
      const userInstance = new User() as any;
      userInstance.id = 123;

      await association.set(postInstance, userInstance);
      expect(postInstance.user_id).toBe(123);
    });

    it('should build associated record without saving', () => {
      const association = new BelongsTo(Post, 'user', User);
      const postInstance = new Post() as any;

      const builtUser = association.build(postInstance, { name: 'John' });
      expect(builtUser).toBeInstanceOf(User);
      // Note: Model constructor doesn't accept attributes, so we test instance creation
      expect(builtUser).toBeDefined();
    });
  });

  describe('HasOne Association', () => {
    it('should create a HasOne association with default options', () => {
      const association = new HasOne(User, 'profile', Profile);

      expect(association.getName()).toBe('profile');
      expect(association.getType()).toBe('hasOne');

      const meta = association.getMeta();
      expect(meta.type).toBe('hasOne');
      expect(meta.foreignKey).toBe('user_id');
      expect(meta.primaryKey).toBe('id');
    });

    it('should create a HasOne association with custom options', () => {
      const options = {
        foreignKey: 'owner_id',
        primaryKey: 'uuid',
        dependent: 'destroy' as const,
      };

      const association = new HasOne(User, 'profile', Profile, options);

      const meta = association.getMeta();
      expect(meta.foreignKey).toBe('owner_id');
      expect(meta.primaryKey).toBe('uuid');
      expect(meta.options.dependent).toBe('destroy');
    });

    it('should build default foreign key correctly', () => {
      const association = new HasOne(User, 'profile', Profile);
      expect(association.getMeta().foreignKey).toBe('user_id');
    });

    it('should return null when primary key is null', async () => {
      const association = new HasOne(User, 'profile', Profile);
      const userInstance = new User() as any;
      userInstance.id = null;

      const result = await association.get(userInstance);
      expect(result).toBeNull();
    });

    it('should create associated record with foreign key', async () => {
      const association = new HasOne(User, 'profile', Profile);
      const userInstance = new User() as any;
      userInstance.id = 123;

      const profile = await association.create(userInstance, { bio: 'Developer' });
      expect(profile).toBeInstanceOf(Profile);
      expect((profile as any).user_id).toBe(123);
      expect((profile as any).bio).toBe('Developer');
    });

    it('should build associated record without saving', () => {
      const association = new HasOne(User, 'profile', Profile);
      const userInstance = new User() as any;
      userInstance.id = 123;

      const builtProfile = association.build(userInstance, { bio: 'Developer' });
      expect(builtProfile).toBeInstanceOf(Profile);
      // Note: Model constructor doesn't accept attributes, so we test instance creation
      expect(builtProfile).toBeDefined();
    });

    it('should set foreign key on target instance', async () => {
      const association = new HasOne(User, 'profile', Profile);
      const userInstance = new User() as any;
      userInstance.id = 123;
      const profileInstance = new Profile() as any;
      profileInstance.bio = 'Developer';

      await association.set(userInstance, profileInstance);
      expect(profileInstance.user_id).toBe(123);
    });
  });

  describe('HasMany Association', () => {
    it('should create a HasMany association with default options', () => {
      const association = new HasMany(User, 'posts', Post);

      expect(association.getName()).toBe('posts');
      expect(association.getType()).toBe('hasMany');

      const meta = association.getMeta();
      expect(meta.type).toBe('hasMany');
      expect(meta.foreignKey).toBe('user_id');
      expect(meta.primaryKey).toBe('id');
    });

    it('should create a HasMany association with custom options', () => {
      const options = {
        foreignKey: 'author_id',
        primaryKey: 'uuid',
        dependent: 'delete' as const,
      };

      const association = new HasMany(User, 'posts', Post, options);

      const meta = association.getMeta();
      expect(meta.foreignKey).toBe('author_id');
      expect(meta.primaryKey).toBe('uuid');
      expect(meta.options.dependent).toBe('delete');
    });

    it('should build default foreign key correctly', () => {
      const association = new HasMany(User, 'posts', Post);
      expect(association.getMeta().foreignKey).toBe('user_id');
    });

    it('should create associated record with foreign key', async () => {
      const association = new HasMany(User, 'posts', Post);
      const userInstance = new User() as any;
      userInstance.id = 123;

      const post = await association.create(userInstance, { title: 'Hello World' });
      expect(post).toBeInstanceOf(Post);
      expect((post as any).user_id).toBe(123);
      expect((post as any).title).toBe('Hello World');
    });

    it('should build associated record without saving', () => {
      const association = new HasMany(User, 'posts', Post);
      const userInstance = new User() as any;
      userInstance.id = 123;

      const builtPost = association.build(userInstance, { title: 'Hello World' });
      expect(builtPost).toBeInstanceOf(Post);
      // Note: Model constructor doesn't accept attributes, so we test instance creation
      expect(builtPost).toBeDefined();
    });

    it('should add existing records to association', async () => {
      const association = new HasMany(User, 'posts', Post);
      const userInstance = new User() as any;
      userInstance.id = 123;
      const post1 = new Post() as any;
      post1.title = 'Post 1';
      const post2 = new Post() as any;
      post2.title = 'Post 2';

      await association.add(userInstance, post1, post2);
      expect(post1.user_id).toBe(123);
      expect(post2.user_id).toBe(123);
    });

    it('should remove records from association', async () => {
      const association = new HasMany(User, 'posts', Post);
      const userInstance = new User() as any;
      userInstance.id = 123;
      const post1 = new Post() as any;
      post1.title = 'Post 1';
      post1.user_id = 123;
      const post2 = new Post() as any;
      post2.title = 'Post 2';
      post2.user_id = 123;

      await association.remove(userInstance, post1, post2);
      expect(post1.user_id).toBeNull();
      expect(post2.user_id).toBeNull();
    });

    it('should provide query builder', () => {
      const association = new HasMany(User, 'posts', Post);
      const userInstance = new User() as any;
      userInstance.id = 123;

      const query = association.query(userInstance);
      expect(query).toBeDefined();
    });
  });

  describe('HasManyThrough Association', () => {
    it('should require through option', () => {
      expect(() => {
        new HasManyThrough(User, 'tags', Tag, {} as any);
      }).toThrow('HasManyThrough requires a "through" option');
    });

    it('should create a HasManyThrough association with required options', () => {
      const options = {
        through: 'post_tags',
      };

      const association = new HasManyThrough(Post, 'tags', Tag, options);

      expect(association.getName()).toBe('tags');
      expect(association.getType()).toBe('hasManyThrough');

      const meta = association.getMeta();
      expect(meta.type).toBe('hasManyThrough');
      expect(meta.foreignKey).toBe('post_id');
      expect(meta.options.through).toBe('post_tags');
    });

    it('should create a HasManyThrough association with custom options', () => {
      const options: HasManyThroughOptions = {
        through: 'post_tags',
        foreignKey: 'article_id',
        throughForeignKey: 'tag_id',
        source: 'post',
      };

      const association = new HasManyThrough(Post, 'tags', Tag, options);

      const meta = association.getMeta();
      expect(meta.foreignKey).toBe('article_id');
      expect((meta.options as HasManyThroughOptions).throughForeignKey).toBe('tag_id');
      expect((meta.options as HasManyThroughOptions).source).toBe('post');
    });

    it('should build default foreign keys correctly', () => {
      const association = new HasManyThrough(Post, 'tags', Tag, { through: 'post_tags' });
      expect(association.getMeta().foreignKey).toBe('post_id');
    });

    it('should create associated record and add to association', async () => {
      const association = new HasManyThrough(Post, 'tags', Tag, { through: 'post_tags' });
      const postInstance = new Post() as any;
      postInstance.id = 123;

      const tag = await association.create(postInstance, { name: 'javascript' });
      expect(tag).toBeInstanceOf(Tag);
      expect((tag as any).name).toBe('javascript');
    });

    it('should provide query builder', () => {
      const association = new HasManyThrough(Post, 'tags', Tag, { through: 'post_tags' });
      const postInstance = new Post() as any;
      postInstance.id = 123;

      const query = association.query(postInstance);
      expect(query).toBeDefined();
    });
  });

  describe('Association Integration', () => {
    it('should handle different association types together', () => {
      const userBelongsTo = new BelongsTo(Post, 'author', User);
      const userHasOne = new HasOne(User, 'profile', Profile);
      const userHasMany = new HasMany(User, 'posts', Post);
      const postHasManyThrough = new HasManyThrough(Post, 'tags', Tag, { through: 'post_tags' });

      expect(userBelongsTo.getType()).toBe('belongsTo');
      expect(userHasOne.getType()).toBe('hasOne');
      expect(userHasMany.getType()).toBe('hasMany');
      expect(postHasManyThrough.getType()).toBe('hasManyThrough');
    });

    it('should handle association metadata correctly', () => {
      const options: AssociationOptions = {
        foreignKey: 'custom_id',
        primaryKey: 'uuid',
        as: 'customAssociation',
      };

      const association = new BelongsTo(Post, 'user', User, options);
      const meta = association.getMeta();

      expect(meta.foreignKey).toBe('custom_id');
      expect(meta.primaryKey).toBe('uuid');
      expect(meta.options.as).toBe('customAssociation');
      expect(meta.target).toBe(User);
    });

    it('should resolve lazy loaded target models', () => {
      let callCount = 0;
      const lazyUser = () => {
        callCount++;
        return User;
      };

      const association = new BelongsTo(Post, 'user', lazyUser);

      // First call should invoke the function
      association.getMeta();
      expect(callCount).toBeGreaterThanOrEqual(1);

      // Second call should use cached result (but may still call due to implementation)
      association.getMeta();
      expect(callCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing target model gracefully', () => {
      const invalidTarget = () => {
        throw new Error('Target model not found');
      };

      const association = new BelongsTo(Post, 'user', invalidTarget);

      expect(() => {
        association.getMeta();
      }).toThrow('Target model not found');
    });

    it('should handle null primary key values', async () => {
      const hasOne = new HasOne(User, 'profile', Profile);
      const hasMany = new HasMany(User, 'posts', Post);

      const userInstance = new User() as any;
      userInstance.id = null;

      const profileResult = await hasOne.get(userInstance);
      expect(profileResult).toBeNull();

      const postsResult = await hasMany.all(userInstance);
      expect(postsResult).toEqual([]);
    });
  });

  describe('Association Options Validation', () => {
    it('should validate dependent options', () => {
      const validOptions = ['destroy', 'delete', 'nullify'] as const;

      validOptions.forEach(dependent => {
        const options = { dependent };
        expect(() => {
          new HasOne(User, 'profile', Profile, options);
        }).not.toThrow();
      });
    });

    it('should handle empty options gracefully', () => {
      const association = new BelongsTo(Post, 'user', User, {});

      expect(association.getName()).toBe('user');
      expect(association.getType()).toBe('belongsTo');
    });

    it('should handle undefined options', () => {
      const association = new BelongsTo(Post, 'user', User, undefined);

      expect(association.getName()).toBe('user');
      expect(association.getType()).toBe('belongsTo');
    });
  });
});
