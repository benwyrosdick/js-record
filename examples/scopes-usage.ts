/**
 * Scopes Usage Example
 * Demonstrates how to use scopes for reusable query logic
 */

import { Model, SqliteAdapter } from '../src/index';

// Setup database
const adapter = new SqliteAdapter({ database: ':memory:' });
await adapter.connect();
Model.setAdapter(adapter);

// Define Product model with scopes
class Product extends Model {
  static tableName = 'products';

  id!: number;
  name!: string;
  category!: string;
  price!: number;
  stock!: number;
  isActive!: boolean;
  createdAt?: Date;
}

// Create table
await adapter.execute(`
  CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('🎯 Scopes Example\n');

// ==============================================================================
// Example 1: Basic Named Scopes
// ==============================================================================
console.log('Example 1: Basic Named Scopes\n');

// Define simple scopes
Product.scope('active', query => {
  return query.where({ isActive: 1 });
});

Product.scope('inactive', query => {
  return query.where({ isActive: 0 });
});

Product.scope('inStock', query => {
  return query.where('stock > ?', 0);
});

Product.scope('outOfStock', query => {
  return query.where({ stock: 0 });
});

console.log('✅ Scopes defined: active, inactive, inStock, outOfStock\n');

// ==============================================================================
// Example 2: Scopes with Parameters
// ==============================================================================
console.log('Example 2: Scopes with Parameters\n');

// Scope with single parameter
Product.scope('byCategory', (query, category: string) => {
  return query.where({ category });
});

// Scope with multiple parameters
Product.scope('priceRange', (query, min: number, max: number) => {
  return query.where('price >= ?', min).where('price <= ?', max);
});

// Scope with default parameter
Product.scope('lowStock', (query, threshold = 10) => {
  return query.where('stock < ?', threshold).where('stock > ?', 0);
});

console.log('✅ Parameterized scopes defined\n');

// ==============================================================================
// Example 3: Complex Scopes
// ==============================================================================
console.log('Example 3: Complex Scopes\n');

// Scope combining multiple conditions
Product.scope('featured', query => {
  return query.where({ isActive: 1 }).where('stock > ?', 0).orderBy('createdAt', 'DESC').limit(5);
});

// Scope with sorting
Product.scope('popular', query => {
  return query.where({ isActive: 1 }).orderBy('price', 'DESC');
});

// Scope for deals
Product.scope('deals', query => {
  return query
    .where({ isActive: 1 })
    .where('price < ?', 50)
    .where('stock > ?', 0)
    .orderBy('price', 'ASC');
});

console.log('✅ Complex scopes defined\n');

// ==============================================================================
// Example 4: Insert Test Data
// ==============================================================================
console.log('Example 4: Inserting Test Data\n');

const products = [
  { name: 'Laptop', category: 'electronics', price: 999, stock: 15, isActive: 1 },
  { name: 'Mouse', category: 'electronics', price: 25, stock: 50, isActive: 1 },
  { name: 'Keyboard', category: 'electronics', price: 75, stock: 0, isActive: 1 },
  { name: 'T-Shirt', category: 'clothing', price: 20, stock: 100, isActive: 1 },
  { name: 'Jeans', category: 'clothing', price: 60, stock: 30, isActive: 1 },
  { name: 'Old Phone', category: 'electronics', price: 200, stock: 5, isActive: 0 },
  { name: 'Headphones', category: 'electronics', price: 150, stock: 8, isActive: 1 },
  { name: 'Shoes', category: 'clothing', price: 80, stock: 0, isActive: 1 },
];

for (const product of products) {
  await adapter.execute(
    'INSERT INTO products (name, category, price, stock, is_active) VALUES (?, ?, ?, ?, ?)',
    [product.name, product.category, product.price, product.stock, product.isActive]
  );
}

console.log(`✅ Inserted ${products.length} products\n`);

// ==============================================================================
// Example 5: Using Scopes
// ==============================================================================
console.log('Example 5: Using Scopes\n');

// Use active scope
const activeProducts = await (Product as any).active().all();
console.log(`Active products: ${activeProducts.length}`);
activeProducts.forEach((p: Product) => console.log(`  - ${p.name}`));
console.log();

// Use inStock scope
const inStockProducts = await (Product as any).inStock().all();
console.log(`In stock: ${inStockProducts.length}`);
inStockProducts.forEach((p: Product) => console.log(`  - ${p.name} (${p.stock} units)`));
console.log();

// Use byCategory scope with parameter
const electronics = await (Product as any).byCategory('electronics').all();
console.log(`Electronics: ${electronics.length}`);
electronics.forEach((p: Product) => console.log(`  - ${p.name}`));
console.log();

// Use priceRange scope with parameters
const midRange = await (Product as any).priceRange(50, 200).all();
console.log(`Products $50-$200: ${midRange.length}`);
midRange.forEach((p: Product) => console.log(`  - ${p.name} ($${p.price})`));
console.log();

// ==============================================================================
// Example 6: Chaining Scopes
// ==============================================================================
console.log('Example 6: Chaining Scopes\n');

// Chain scopes with additional where clauses
const activeElectronics = await (Product as any).active().where({ category: 'electronics' }).all();
console.log(`Active electronics: ${activeElectronics.length}`);
activeElectronics.forEach((p: Product) => console.log(`  - ${p.name}`));
console.log();

// Chain with additional query methods
const cheapInStock = await (Product as any)
  .inStock()
  .where('price < ?', 100)
  .orderBy('price', 'ASC')
  .all();
console.log(`Cheap in-stock items: ${cheapInStock.length}`);
cheapInStock.forEach((p: Product) => console.log(`  - ${p.name} ($${p.price})`));
console.log();

// ==============================================================================
// Example 7: Default Scopes
// ==============================================================================
console.log('Example 7: Default Scopes\n');

// Define User model with default scope
class User extends Model {
  static tableName = 'users';

  id!: number;
  name!: string;
  deleted_at?: Date;
}

// Set default scope to exclude deleted users
User.defaultScope({
  where: { deleted_at: null },
  order: ['name', 'ASC'],
});

await adapter.execute(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    deleted_at TEXT
  )
`);

await adapter.execute('INSERT INTO users (name, deleted_at) VALUES (?, ?)', ['Alice', null]);
await adapter.execute('INSERT INTO users (name, deleted_at) VALUES (?, ?)', ['Bob', null]);
await adapter.execute('INSERT INTO users (name, deleted_at) VALUES (?, ?)', [
  'Charlie',
  '2025-01-01',
]);

// Default scope automatically applied
const users = await User.all();
console.log(`Users (default scope): ${users.length}`);
users.forEach((u: User) => console.log(`  - ${u.name}`));
console.log();

// Bypass default scope
const allUsers = await User.unscoped().all();
console.log(`All users (unscoped): ${allUsers.length}`);
allUsers.forEach((u: User) => console.log(`  - ${u.name} ${u.deleted_at ? '(deleted)' : ''}`));
console.log();

// ==============================================================================
// Example 8: Scope Composition
// ==============================================================================
console.log('Example 8: Scope Composition\n');

// Create composite scopes
Product.scope('availableElectronics', query => {
  return query.where({ is_active: 1 }).where('stock > ?', 0).where({ category: 'electronics' });
});

const available = await (Product as any).availableElectronics().all();
console.log(`Available electronics: ${available.length}`);
available.forEach((p: Product) => console.log(`  - ${p.name}`));
console.log();

// ==============================================================================
// Example 9: Using Scopes with Count
// ==============================================================================
console.log('Example 9: Using Scopes with Count\n');

const activeCount = await (Product as any).active().count();
const inStockCount = await (Product as any).inStock().count();
const dealsCount = await (Product as any).deals().count();

console.log(`Active products: ${activeCount}`);
console.log(`In stock: ${inStockCount}`);
console.log(`Deals: ${dealsCount}\n`);

// ==============================================================================
// Example 10: Using Scopes with Exists
// ==============================================================================
console.log('Example 10: Using Scopes with Exists\n');

const hasDeals = await (Product as any).deals().exists();
const hasOutOfStock = await (Product as any).outOfStock().exists();

console.log(`Has deals: ${hasDeals}`);
console.log(`Has out of stock: ${hasOutOfStock}\n`);

// ==============================================================================
// Example 11: Using Scopes with First/Last
// ==============================================================================
console.log('Example 11: Using Scopes with First/Last\n');

const firstDeal = await (Product as any).deals().first();
const lastActive = await (Product as any).active().last();

if (firstDeal) console.log(`First deal: ${firstDeal.name} ($${firstDeal.price})`);
if (lastActive) console.log(`Last active: ${lastActive.name}\n`);

// ==============================================================================
// Best Practices
// ==============================================================================
console.log('📚 Best Practices:\n');
console.log('1. Use scopes for commonly used queries');
console.log('2. Keep scopes focused on single responsibility');
console.log('3. Use descriptive names (active, published, featured)');
console.log('4. Combine scopes for complex queries');
console.log('5. Use default scopes for soft deletes or multi-tenancy');
console.log('6. Remember: scopes return QueryBuilder, chain with .all()/.first()/etc.');
console.log('7. Use unscoped() to bypass default scopes when needed\n');

// Clean up
await adapter.disconnect();
console.log('✅ Example completed!');
