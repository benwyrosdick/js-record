/**
 * Test script to verify QueryBuilder functionality
 * 
 * Usage:
 *   ts-node test-query-builder.ts
 */

import { PostgresAdapter, QueryBuilder } from './src';

async function testQueryBuilder() {
  console.log('🔧 Testing Query Builder...\n');

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'js_record_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };

  const adapter = new PostgresAdapter(config);

  try {
    await adapter.connect();
    console.log('✅ Connected to database\n');

    // Create test table
    console.log('📋 Setting up test data...');
    await adapter.execute('DROP TABLE IF EXISTS users CASCADE');
    await adapter.execute(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        age INTEGER,
        city VARCHAR(100),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert test data
    const users = [
      { name: 'Alice Johnson', email: 'alice@example.com', age: 28, city: 'New York', active: true },
      { name: 'Bob Smith', email: 'bob@example.com', age: 35, city: 'Los Angeles', active: true },
      { name: 'Charlie Brown', email: 'charlie@example.com', age: 42, city: 'Chicago', active: false },
      { name: 'Diana Prince', email: 'diana@example.com', age: 30, city: 'New York', active: true },
      { name: 'Eve Adams', email: 'eve@example.com', age: 25, city: 'Boston', active: true },
      { name: 'Frank Miller', email: 'frank@example.com', age: 50, city: 'Chicago', active: false },
    ];

    for (const user of users) {
      await adapter.execute(
        'INSERT INTO users (name, email, age, city, active) VALUES ($1, $2, $3, $4, $5)',
        [user.name, user.email, user.age, user.city, user.active]
      );
    }
    console.log('✅ Test data inserted\n');

    // Test 1: Basic select all
    console.log('1️⃣  Basic SELECT all:');
    const qb1 = new QueryBuilder(adapter, 'users');
    const sql1 = qb1.toSql();
    console.log(`   SQL: ${sql1.sql}`);
    const result1 = await qb1.all();
    console.log(`   ✅ Found ${result1.length} users\n`);

    // Test 2: Select specific columns
    console.log('2️⃣  SELECT specific columns:');
    const qb2 = new QueryBuilder(adapter, 'users');
    const sql2 = qb2.select('id', 'name', 'email').toSql();
    console.log(`   SQL: ${sql2.sql}`);
    const result2 = await qb2.select('id', 'name', 'email').all();
    console.log(`   ✅ Found ${result2.length} users`);
    console.log(`   Sample: ${JSON.stringify(result2[0])}\n`);

    // Test 3: WHERE with object
    console.log('3️⃣  WHERE with object conditions:');
    const qb3 = new QueryBuilder(adapter, 'users');
    const sql3 = qb3.where({ active: true, city: 'New York' }).toSql();
    console.log(`   SQL: ${sql3.sql}`);
    console.log(`   Params: ${JSON.stringify(sql3.params)}`);
    const result3 = await qb3.where({ active: true, city: 'New York' }).all();
    console.log(`   ✅ Found ${result3.length} active users in New York\n`);

    // Test 4: WHERE with raw SQL
    console.log('4️⃣  WHERE with raw SQL:');
    const qb4 = new QueryBuilder(adapter, 'users');
    const sql4 = qb4.where('age > ?', 30).toSql();
    console.log(`   SQL: ${sql4.sql}`);
    console.log(`   Params: ${JSON.stringify(sql4.params)}`);
    const result4 = await qb4.where('age > ?', 30).all();
    console.log(`   ✅ Found ${result4.length} users over 30\n`);

    // Test 5: WHERE with operator
    console.log('5️⃣  WHERE with operator:');
    const qb5 = new QueryBuilder(adapter, 'users');
    const sql5 = qb5.where('age', '>=', 30).toSql();
    console.log(`   SQL: ${sql5.sql}`);
    console.log(`   Params: ${JSON.stringify(sql5.params)}`);
    const result5 = await qb5.where('age', '>=', 30).all();
    console.log(`   ✅ Found ${result5.length} users aged 30+\n`);

    // Test 6: WHERE IN
    console.log('6️⃣  WHERE IN:');
    const qb6 = new QueryBuilder(adapter, 'users');
    const sql6 = qb6.whereIn('city', ['New York', 'Chicago']).toSql();
    console.log(`   SQL: ${sql6.sql}`);
    console.log(`   Params: ${JSON.stringify(sql6.params)}`);
    const result6 = await qb6.whereIn('city', ['New York', 'Chicago']).all();
    console.log(`   ✅ Found ${result6.length} users in NY or Chicago\n`);

    // Test 7: OR WHERE
    console.log('7️⃣  OR WHERE:');
    const qb7 = new QueryBuilder(adapter, 'users');
    const sql7 = qb7.where({ city: 'Boston' }).orWhere({ city: 'Los Angeles' }).toSql();
    console.log(`   SQL: ${sql7.sql}`);
    console.log(`   Params: ${JSON.stringify(sql7.params)}`);
    const result7 = await qb7.where({ city: 'Boston' }).orWhere({ city: 'Los Angeles' }).all();
    console.log(`   ✅ Found ${result7.length} users\n`);

    // Test 8: ORDER BY
    console.log('8️⃣  ORDER BY:');
    const qb8 = new QueryBuilder(adapter, 'users');
    const sql8 = qb8.orderBy('age', 'DESC').toSql();
    console.log(`   SQL: ${sql8.sql}`);
    const result8 = await qb8.orderBy('age', 'DESC').all();
    console.log(`   ✅ Ordered by age DESC`);
    console.log(`   Oldest: ${result8[0].name} (${result8[0].age})`);
    console.log(`   Youngest: ${result8[result8.length - 1].name} (${result8[result8.length - 1].age})\n`);

    // Test 9: LIMIT and OFFSET
    console.log('9️⃣  LIMIT and OFFSET:');
    const qb9 = new QueryBuilder(adapter, 'users');
    const sql9 = qb9.limit(2).offset(1).toSql();
    console.log(`   SQL: ${sql9.sql}`);
    const result9 = await qb9.limit(2).offset(1).all();
    console.log(`   ✅ Found ${result9.length} users (limited to 2, offset 1)\n`);

    // Test 10: first() method
    console.log('🔟 first() method:');
    const qb10 = new QueryBuilder(adapter, 'users');
    const result10 = await qb10.where({ active: true }).orderBy('age', 'ASC').first();
    console.log(`   ✅ Youngest active user: ${result10?.name} (${result10?.age})\n`);

    // Test 11: count() method
    console.log('1️⃣1️⃣  count() method:');
    const qb11 = new QueryBuilder(adapter, 'users');
    const count11 = await qb11.where({ active: true }).count();
    console.log(`   ✅ Active users count: ${count11}\n`);

    // Test 12: exists() method
    console.log('1️⃣2️⃣  exists() method:');
    const qb12 = new QueryBuilder(adapter, 'users');
    const exists12 = await qb12.where('age', '>', 100).exists();
    console.log(`   ✅ Users over 100 exist: ${exists12}\n`);

    // Test 13: Complex chained query
    console.log('1️⃣3️⃣  Complex chained query:');
    const qb13 = new QueryBuilder(adapter, 'users');
    qb13
      .select('name', 'email', 'age', 'city')
      .where({ active: true })
      .where('age', '>=', 25)
      .whereIn('city', ['New York', 'Boston', 'Los Angeles'])
      .orderBy('age', 'DESC')
      .limit(3);
    const sql13 = qb13.toSql();
    console.log(`   SQL: ${sql13.sql}`);
    console.log(`   Params: ${JSON.stringify(sql13.params)}`);
    const result13 = await qb13.all();
    console.log(`   ✅ Found ${result13.length} users:`);
    result13.forEach(u => console.log(`      - ${u.name}, ${u.age}, ${u.city}`));
    console.log();

    // Test 14: GROUP BY and aggregate
    console.log('1️⃣4️⃣  GROUP BY:');
    const qb14 = new QueryBuilder(adapter, 'users');
    qb14.select('city', 'COUNT(*) as count').groupBy('city').orderBy('count', 'DESC');
    const sql14 = qb14.toSql();
    console.log(`   SQL: ${sql14.sql}`);
    const result14 = await qb14.all();
    console.log(`   ✅ Users by city:`);
    result14.forEach((r: any) => console.log(`      - ${r.city}: ${r.count}`));
    console.log();

    // Test 15: DISTINCT
    console.log('1️⃣5️⃣  DISTINCT:');
    const qb15 = new QueryBuilder(adapter, 'users');
    qb15.distinct().select('city');
    const sql15 = qb15.toSql();
    console.log(`   SQL: ${sql15.sql}`);
    const result15 = await qb15.all();
    console.log(`   ✅ Distinct cities: ${result15.map((r: any) => r.city).join(', ')}\n`);

    // Test 16: paginate() method
    console.log('1️⃣6️⃣  paginate() method:');
    const qb16 = new QueryBuilder(adapter, 'users');
    const pagination = await qb16.orderBy('name', 'ASC').paginate(1, 2);
    console.log(`   ✅ Page ${pagination.page} of ${pagination.totalPages}`);
    console.log(`   Total records: ${pagination.total}`);
    console.log(`   Showing ${pagination.data.length} records`);
    pagination.data.forEach(u => console.log(`      - ${u.name}`));
    console.log();

    // Test 17: whereNull and whereNotNull
    console.log('1️⃣7️⃣  whereNull and whereNotNull:');
    const qb17 = new QueryBuilder(adapter, 'users');
    const sql17 = qb17.whereNotNull('age').toSql();
    console.log(`   SQL: ${sql17.sql}`);
    const result17 = await qb17.whereNotNull('age').count();
    console.log(`   ✅ Users with age set: ${result17}\n`);

    // Test 18: JOIN
    console.log('1️⃣8️⃣  JOIN (creating related table):');
    await adapter.execute('DROP TABLE IF EXISTS orders');
    await adapter.execute(`
      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        total DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await adapter.execute('INSERT INTO orders (user_id, total) VALUES (1, 99.99), (1, 150.00), (2, 75.50)');
    
    const qb18 = new QueryBuilder(adapter, 'users');
    qb18
      .select('users.name', 'users.email', 'orders.total')
      .join('orders', 'users.id', '=', 'orders.user_id');
    const sql18 = qb18.toSql();
    console.log(`   SQL: ${sql18.sql}`);
    const result18 = await qb18.all();
    console.log(`   ✅ Found ${result18.length} order records:`);
    result18.forEach((r: any) => console.log(`      - ${r.name}: $${r.total}`));
    console.log();

    console.log('✨ All Query Builder tests passed!\n');

    // Cleanup
    console.log('🧹 Cleaning up...');
    await adapter.execute('DROP TABLE IF EXISTS orders');
    await adapter.execute('DROP TABLE IF EXISTS users');
    console.log('✅ Cleanup complete\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await adapter.disconnect();
    console.log('👋 Disconnected from database');
  }
}

// Run tests
testQueryBuilder().catch(console.error);
