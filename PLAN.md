# TypeScript ActiveRecord ORM - Architecture Plan

## Core Design Principles

1. **ActiveRecord Pattern**: Models inherit from a base class, combining data access and business logic
2. **Convention over Configuration**: Sensible defaults with override options
3. **Type Safety**: Leverage TypeScript's type system for compile-time safety
4. **Fluent API**: Chainable query interface for intuitive query building
5. **Database Agnostic Core**: Adapter pattern for multiple database support

---

## Feature Set

### Phase 1: Core Foundation

#### 1. Model Definition & Schema
- Base `Model` class that all models inherit from
- Automatic table name inference (pluralized, snake_case)
- Column type definitions with TypeScript decorators or schema DSL
- Primary key support (default: `id`)
- Timestamps (`created_at`, `updated_at`) with auto-management
- Custom table names and column mappings

#### 2. CRUD Operations
```typescript
// Create
const user = new User({ name: 'John', email: 'john@example.com' })
await user.save()
await User.create({ name: 'Jane', email: 'jane@example.com' })

// Read
const user = await User.find(1)
const user = await User.findBy({ email: 'john@example.com' })
const users = await User.all()

// Update
user.name = 'John Doe'
await user.save()
await user.update({ name: 'John Doe' })
await User.update(1, { name: 'John Doe' })

// Delete
await user.destroy()
await User.destroy(1)
```

#### 3. Query Interface
```typescript
// Chainable queries
await User.where({ active: true })
  .order('created_at DESC')
  .limit(10)
  .all()

// Method chaining
await User.select('id', 'name')
  .where('age > ?', 18)
  .orWhere({ status: 'premium' })
  .groupBy('country')
  .having('count(*) > ?', 5)
  .all()

// Find methods
await User.first()
await User.last()
await User.findBy({ email: 'test@example.com' })
await User.where({ active: true }).first()
```

#### 4. Validations
```typescript
class User extends Model {
  static validations = {
    name: { presence: true, length: { min: 2, max: 100 } },
    email: { presence: true, format: /email-regex/, uniqueness: true },
    age: { numericality: { greaterThan: 0, lessThan: 150 } }
  }
}

// Usage
const user = new User({ name: 'A' })
await user.isValid() // false
user.errors // { name: ['is too short (minimum 2 characters)'] }
await user.save() // false, doesn't save if invalid
```

#### 5. Callbacks/Hooks
```typescript
class User extends Model {
  async beforeCreate() {
    this.uuid = generateUUID()
  }
  
  async afterCreate() {
    await sendWelcomeEmail(this.email)
  }
  
  async beforeSave() {
    this.email = this.email.toLowerCase()
  }
}
```

Hooks: `beforeValidation`, `afterValidation`, `beforeSave`, `afterSave`, `beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`, `beforeDestroy`, `afterDestroy`

### Phase 2: Associations

#### 1. Relationship Types
```typescript
class User extends Model {
  static associations = {
    posts: { hasMany: Post },
    profile: { hasOne: Profile },
    comments: { hasMany: Comment }
  }
}

class Post extends Model {
  static associations = {
    user: { belongsTo: User },
    tags: { hasMany: Tag, through: 'post_tags' }
  }
}

// Usage
const user = await User.find(1)
const posts = await user.posts.all()
const post = await user.posts.create({ title: 'New Post' })
```

#### 2. Association Options
- `foreignKey`: Custom foreign key name
- `through`: For many-to-many relationships
- `dependent`: Cascade delete behavior
- `as`: Polymorphic associations
- Eager loading: `User.includes('posts', 'profile').all()`

### Phase 3: Advanced Features

#### 1. Scopes
```typescript
class User extends Model {
  static scopes = {
    active: () => this.where({ active: true }),
    recent: () => this.where('created_at > ?', thirtyDaysAgo).order('created_at DESC'),
    admins: () => this.where({ role: 'admin' })
  }
}

// Usage
await User.active().recent().all()
await User.admins().count()
```

#### 2. Migrations
```typescript
export default {
  up: async (db) => {
    await db.createTable('users', (t) => {
      t.increments('id').primary()
      t.string('name').notNull()
      t.string('email').unique().notNull()
      t.integer('age')
      t.boolean('active').default(true)
      t.timestamps()
    })
    
    await db.addIndex('users', 'email')
  },
  
  down: async (db) => {
    await db.dropTable('users')
  }
}
```

#### 3. Transactions
```typescript
await Model.transaction(async (trx) => {
  const user = await User.create({ name: 'John' }, { transaction: trx })
  const account = await Account.create({ userId: user.id, balance: 100 }, { transaction: trx })
  // Auto-commits on success, auto-rolls back on error
})
```

#### 4. Raw Queries & Query Fragments
```typescript
await User.raw('SELECT * FROM users WHERE age > $1', [18])
await User.where('EXTRACT(year FROM created_at) = ?', 2024).all()
```

---

## Technical Architecture

### 1. Core Components

```
src/
├── core/
│   ├── Model.ts              # Base Model class
│   ├── QueryBuilder.ts       # Fluent query interface
│   ├── Connection.ts         # Database connection manager
│   ├── Schema.ts             # Schema definition utilities
│   └── Migration.ts          # Migration runner
├── adapters/
│   ├── Adapter.ts            # Base adapter interface
│   ├── PostgresAdapter.ts    # PostgreSQL implementation
│   └── types.ts              # Adapter type definitions
├── associations/
│   ├── Association.ts        # Base association class
│   ├── HasMany.ts
│   ├── HasOne.ts
│   ├── BelongsTo.ts
│   └── HasManyThrough.ts
├── validations/
│   ├── Validator.ts          # Validation engine
│   └── rules/                # Built-in validation rules
├── callbacks/
│   └── CallbackChain.ts      # Callback/hook system
└── types/
    └── index.ts              # TypeScript type definitions
```

### 2. Database Adapter Interface

```typescript
interface DatabaseAdapter {
  // Connection
  connect(config: ConnectionConfig): Promise<void>
  disconnect(): Promise<void>
  
  // Query execution
  query<T>(sql: string, params?: any[]): Promise<T[]>
  execute(sql: string, params?: any[]): Promise<{ rowCount: number }>
  
  // Transactions
  beginTransaction(): Promise<Transaction>
  
  // Schema introspection
  getTableInfo(tableName: string): Promise<TableInfo>
  getColumns(tableName: string): Promise<ColumnInfo[]>
  
  // Query building helpers
  escapeIdentifier(identifier: string): string
  formatValue(value: any): string
}
```

### 3. Type Safety Strategy

```typescript
// Model definition with full type inference
class User extends Model {
  id!: number
  name!: string
  email!: string
  age?: number
  createdAt!: Date
  updatedAt!: Date
  
  // Associations are typed
  posts!: HasManyRelation<Post>
  profile!: HasOneRelation<Profile>
}

// Queries return properly typed results
const user: User = await User.find(1)
const users: User[] = await User.where({ active: true }).all()

// Query builder maintains type safety
await User.where({ name: 'John' })  // OK
await User.where({ invalidField: 'test' })  // TypeScript error
```

---

## PostgreSQL Adapter Specifics

### 1. Connection Management
- Use `pg` package (node-postgres)
- Connection pooling support
- Support for both connection strings and config objects
- SSL/TLS support

### 2. PostgreSQL-Specific Features
- JSONB column support
- Array columns
- UUID support
- Full-text search
- RETURNING clause for INSERT/UPDATE
- CTEs (Common Table Expressions)
- Window functions support

### 3. Query Parameter Binding
- Use parameterized queries ($1, $2, etc.) to prevent SQL injection
- Automatic type coercion

---

## Getting Started Implementation Order

1. **Database Adapter** - PostgreSQL adapter with connection and basic query execution
2. **Query Builder** - SQL generation and parameter binding
3. **Base Model** - Core CRUD operations
4. **Schema & Column Definitions** - Type mapping and table introspection
5. **Validations** - Validation framework
6. **Callbacks** - Hook system
7. **Associations** - Relationship management
8. **Migrations** - Schema migration system
9. **Transactions** - Transaction support
10. **Advanced Features** - Scopes, eager loading, etc.
