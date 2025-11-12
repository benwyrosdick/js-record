# Scopes Guide

Scopes allow you to define reusable query conditions that can be chained together, making your code more readable and maintainable.

## Table of Contents

- [Basic Scopes](#basic-scopes)
- [Parameterized Scopes](#parameterized-scopes)
- [Default Scopes](#default-scopes)
- [Using Scopes](#using-scopes)
- [Chaining Scopes](#chaining-scopes)
- [Removing Scopes](#removing-scopes)
- [Best Practices](#best-practices)

## Basic Scopes

Define simple scopes for commonly used queries:

```typescript
class Post extends Model {
  static tableName = 'posts';
}

// Define scopes
Post.scope('published', query => {
  return query.where({ status: 'published' });
});

Post.scope('draft', query => {
  return query.where({ status: 'draft' });
});

Post.scope('recent', query => {
  return query.orderBy('created_at', 'DESC').limit(10);
});

// Use scopes
const publishedPosts = await (Post as any).published().all();
const recentPosts = await (Post as any).recent().all();
```

## Parameterized Scopes

Scopes can accept parameters for dynamic queries:

```typescript
// Scope with single parameter
Post.scope('byAuthor', (query, authorId: number) => {
  return query.where({ author_id: authorId });
});

// Scope with multiple parameters
Post.scope('dateRange', (query, startDate: Date, endDate: Date) => {
  return query.where('created_at >= ?', startDate).where('created_at <= ?', endDate);
});

// Scope with default parameter
Post.scope('popular', (query, minViews = 100) => {
  return query.where('views >= ?', minViews);
});

// Usage
const myPosts = await (Post as any).byAuthor(123).all();
const rangePosts = await (Post as any).dateRange(startDate, endDate).all();
const veryPopular = await (Post as any).popular(1000).all();
```

## Default Scopes

Default scopes are automatically applied to all queries for a model:

```typescript
class User extends Model {
  static tableName = 'users';
}

// Apply default scope
User.defaultScope({
  where: { deleted_at: null }, // Soft delete pattern
  order: ['name', 'ASC'], // Default ordering
});

// Automatically filtered and ordered
const users = await User.all(); // Only non-deleted, ordered by name

// Bypass default scope when needed
const allUsers = await User.unscoped().all(); // Includes deleted
```

### Default Scope Options

```typescript
interface DefaultScopeOptions {
  // Conditions to apply
  where?: Record<string, any>;

  // Order to apply
  order?: string | [string, 'ASC' | 'DESC'];

  // Custom scope function
  scope?: (query: QueryBuilder) => QueryBuilder;
}
```

### Common Use Cases for Default Scopes

1. **Soft Deletes**

```typescript
User.defaultScope({
  where: { deleted_at: null },
});
```

2. **Multi-tenancy**

```typescript
// Assuming current tenant is stored somewhere
const currentTenantId = getCurrentTenantId();

Document.defaultScope({
  where: { tenant_id: currentTenantId },
});
```

3. **Published Content**

```typescript
Article.defaultScope({
  where: { published: true },
  order: ['published_at', 'DESC'],
});
```

## Using Scopes

### Basic Usage

```typescript
// Scopes return a QueryBuilder
const query = (Post as any).published();

// Chain with other query methods
const posts = await (Post as any).published().all();
const post = await (Post as any).published().first();
const count = await (Post as any).published().count();
const exists = await (Post as any).published().exists();
```

### With Additional Conditions

```typescript
// Scope + where
const filtered = await (Post as any).published().where('views > ?', 100).all();

// Scope + order
const sorted = await (Post as any).published().orderBy('views', 'DESC').all();

// Scope + pagination
const paginated = await (Post as any).published().paginate(1, 20);
```

## Chaining Scopes

Scopes can be chained with query builder methods:

```typescript
// Define multiple scopes
Post.scope('published', query => {
  return query.where({ status: 'published' });
});

Post.scope('featured', query => {
  return query.where({ is_featured: true });
});

Post.scope('recent', query => {
  return query.orderBy('created_at', 'DESC').limit(10);
});

// Chain scopes with query methods
const posts = await (Post as any)
  .published()
  .where({ is_featured: true })
  .orderBy('views', 'DESC')
  .limit(5)
  .all();
```

### Complex Scope Composition

```typescript
// Create a composite scope
Post.scope('trending', query => {
  return query
    .where({ status: 'published' })
    .where('views >= ?', 1000)
    .where('created_at >= ?', lastWeek)
    .orderBy('views', 'DESC')
    .limit(10);
});

// Use it
const trending = await (Post as any).trending().all();
```

## Removing Scopes

### Bypassing Default Scope

```typescript
// Query without default scope
const all = await Model.unscoped().all();

// Combine unscoped with other conditions
const deleted = await User.unscoped().where('deleted_at IS NOT NULL').all();
```

## Scope Examples

### E-commerce Product Scopes

```typescript
class Product extends Model {
  static tableName = 'products';
}

// Basic filters
Product.scope('active', query => {
  return query.where({ is_active: true });
});

Product.scope('inStock', query => {
  return query.where('stock > ?', 0);
});

// Category filter
Product.scope('byCategory', (query, category: string) => {
  return query.where({ category });
});

// Price range
Product.scope('priceRange', (query, min: number, max: number) => {
  return query.where('price >= ?', min).where('price <= ?', max);
});

// Deals
Product.scope('onSale', query => {
  return query.where('discount_price IS NOT NULL');
});

// Popular items
Product.scope('bestsellers', query => {
  return query.where({ is_active: true }).orderBy('sales_count', 'DESC').limit(20);
});

// Usage
const activeElectronics = await (Product as any).active().where({ category: 'electronics' }).all();

const affordableInStock = await (Product as any).inStock().priceRange(0, 100).all();
```

### Blog Post Scopes

```typescript
class Post extends Model {
  static tableName = 'posts';
}

Post.scope('published', query => {
  return query.where({ status: 'published' });
});

Post.scope('draft', query => {
  return query.where({ status: 'draft' });
});

Post.scope('scheduled', query => {
  return query.where({ status: 'scheduled' }).where('publish_at > ?', new Date());
});

Post.scope('byTag', (query, tag: string) => {
  return query.where('tags LIKE ?', `%${tag}%`);
});

Post.scope('search', (query, term: string) => {
  return query.where('title', 'LIKE', `%${term}%`);
});

Post.scope('popular', (query, days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return query
    .where({ status: 'published' })
    .where('created_at >= ?', since)
    .orderBy('views', 'DESC');
});

// Usage
const recentPublished = await (Post as any)
  .published()
  .where('created_at >= ?', lastMonth)
  .orderBy('created_at', 'DESC')
  .all();

const popularTech = await (Post as any).popular(7).where('category = ?', 'tech').limit(10).all();
```

### User Scopes

```typescript
class User extends Model {
  static tableName = 'users';
}

// Default scope: exclude deleted users
User.defaultScope({
  where: { deleted_at: null },
});

// Active users
User.scope('active', query => {
  return query.where({ is_active: true });
});

// By role
User.scope('withRole', (query, role: string) => {
  return query.where({ role });
});

// Recently joined
User.scope('recentlyJoined', (query, days = 7) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return query.where('created_at >= ?', since);
});

// Verified users
User.scope('verified', query => {
  return query.where('email_verified_at IS NOT NULL');
});

// Usage
const newAdmins = await (User as any).withRole('admin').recentlyJoined(30).all();

const allUsers = await User.unscoped().all(); // Include deleted
```

## Best Practices

### 1. Keep Scopes Focused

✅ **Good**: Single responsibility

```typescript
Post.scope('published', query => {
  return query.where({ status: 'published' });
});

Post.scope('recent', query => {
  return query.orderBy('created_at', 'DESC').limit(10);
});
```

❌ **Bad**: Too many concerns

```typescript
Post.scope('publishedRecentPopular', query => {
  return query
    .where({ status: 'published' })
    .where('views > ?', 100)
    .orderBy('created_at', 'DESC')
    .limit(10);
});
```

### 2. Use Descriptive Names

✅ **Good**: Clear and descriptive

```typescript
Product.scope('inStock', (query) => { ... });
Product.scope('onSale', (query) => { ... });
Product.scope('featured', (query) => { ... });
```

❌ **Bad**: Vague names

```typescript
Product.scope('special', (query) => { ... });
Product.scope('filter1', (query) => { ... });
```

### 3. Provide Default Parameters

```typescript
// Good: sensible defaults
Post.scope('recent', (query, limit = 10) => {
  return query.orderBy('created_at', 'DESC').limit(limit);
});

Post.scope('popular', (query, minViews = 100) => {
  return query.where('views >= ?', minViews);
});
```

### 4. Document Complex Scopes

```typescript
/**
 * Returns trending posts from the last N days
 * Filters by published status and minimum view count
 *
 * @param query - QueryBuilder instance
 * @param days - Number of days to look back (default: 7)
 * @param minViews - Minimum number of views (default: 100)
 */
Post.scope('trending', (query, days = 7, minViews = 100) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return query
    .where({ status: 'published' })
    .where('views >= ?', minViews)
    .where('created_at >= ?', since)
    .orderBy('views', 'DESC');
});
```

### 5. Use Default Scopes Carefully

Default scopes affect ALL queries, so use them only for:

- Soft deletes
- Multi-tenancy
- Global filters that always apply

```typescript
// Good use case: soft deletes
User.defaultScope({
  where: { deleted_at: null },
});

// Be careful with ordering in default scopes
// It might conflict with custom ordering
```

### 6. Remember to Call Query Methods

Scopes return QueryBuilder, not results:

```typescript
// ❌ Wrong: returns QueryBuilder
const posts = (Post as any).published();

// ✅ Correct: execute the query
const posts = await (Post as any).published().all();
const first = await (Post as any).published().first();
const count = await (Post as any).published().count();
```

## Type Safety

For better TypeScript support, you can define scope methods in your model:

```typescript
class Post extends Model {
  static tableName = 'posts';

  // Define static methods for type safety
  static published() {
    return this.query().where({ status: 'published' });
  }

  static draft() {
    return this.query().where({ status: 'draft' });
  }

  static byAuthor(authorId: number) {
    return this.query().where({ author_id: authorId });
  }
}

// Now you get full type safety
const posts = await Post.published().all();
const myPosts = await Post.byAuthor(123).all();
```

## Performance Considerations

1. **Scopes are evaluated at query time** - No performance overhead
2. **Combine conditions efficiently** - Scopes with WHERE conditions are merged
3. **Be mindful of N+1 queries** - Use eager loading when needed
4. **Index scope conditions** - Add database indexes for commonly scoped columns

```typescript
// Good: indexed column
Post.scope('published', query => {
  return query.where({ status: 'published' }); // Index on 'status'
});

// Consider indexes for:
// - Status columns
// - Foreign keys used in scopes
// - Date columns for time-based scopes
```

## Troubleshooting

### Default Scope Always Applied

```typescript
// Problem: Can't query deleted records
const deleted = await User.where({ deleted_at: 'NOT NULL' }).all();
// Still filters out deleted due to default scope

// Solution: Use unscoped()
const deleted = await User.unscoped().where('deleted_at IS NOT NULL').all();
```

### Scope Not Found

```typescript
// Problem: TypeError: Model.myScope is not a function
const results = await Model.myScope().all();

// Solution: Make sure scope is defined
Model.scope('myScope', (query) => {
  return query.where({ ... });
});
```

### Chaining Multiple Scopes

```typescript
// Scopes return QueryBuilder, not a scoped Model
// So you can't chain scopes directly

// ❌ This won't work:
const results = await Model.scope1().scope2().all();

// ✅ Use query methods instead:
const results = await Model.scope1()
  .where({ ... })  // Add conditions from scope2 manually
  .all();
```

## Resources

- [QueryBuilder Documentation](../src/core/QueryBuilder.ts)
- [Model Documentation](../src/core/Model.ts)
- [Scopes Example](../examples/scopes-usage.ts)
- [Scopes Test](../test-scopes.ts)

---

**Next Steps:**

- Try the [scopes example](../examples/scopes-usage.ts)
- Run tests: `bun run test:scopes`
- Learn about [Associations](./ASSOCIATIONS.md)
