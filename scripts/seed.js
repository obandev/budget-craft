const { db } = require('@vercel/postgres');
const bcrypt = require('bcrypt');

async function seedCategories(client) {
  try {
    // Create the "categories" table if it doesn't exist
    const createTable = await client.sql`
      CREATE TABLE IF NOT EXISTS categories (
        category_id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL
      );
    `;

    console.log(`Created "categories" table`);

    // Insert data into the "categories" table
    const insertedCategories = await Promise.all(
      ['food', 'leisure', 'transportation'].map(
        (category) => client.sql`
          INSERT INTO categories (name)
          VALUES (${category})
          ON CONFLICT (category_id) DO NOTHING;
        `,
      ),
    );

    console.log(`Seeded ${insertedCategories.length} categories`);

    return {
      createTable,
      categories: insertedCategories,
    };
  } catch (error) {
    console.error('Error seeding categories:', error);
    throw error;
  }
}

async function seedUsers(client) {
  try {
    await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    // Create the "users" table if it doesn't exist
    const createTable = await client.sql`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        password VARCHAR(50) NOT NULL,  -- Note: For simplicity, assume password is stored in plain text (In practice, use hashing and salting)
        email VARCHAR(100) NOT NULL UNIQUE
      );
    `;

    console.log(`Created "users" table`);

    // Insert data into the "users" table
    const insertedUsers = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        return client.sql`
        INSERT INTO users (username, password, email)
        VALUES (${user.username}, ${hashedPassword}, ${user.email})
        ON CONFLICT (user_id) DO NOTHING;
      `;
      }),
    );

    console.log(`Seeded ${insertedUsers.length} users`);

    return {
      createTable,
      users: insertedUsers,
    };
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
}

async function seedBudgets(client) {
  try {
    // Create the "budgets" table if it doesn't exist
    const createTable = await client.sql`
      CREATE TABLE IF NOT EXISTS budgets (
        budget_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
        category_id INT REFERENCES categories(category_id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        PRIMARY KEY (user_id, category_id)
      );
    `;

    console.log(`Created "budgets" table`);

    // Insert data into the "budgets" table
    const insertedBudgets = await Promise.all(
      users.map(async (user) => {
        return Promise.all(
          ['food', 'leisure', 'transportation'].map(async (category) => {
            const category_id_query = await client.sql`
                SELECT category_id FROM categories WHERE name = ${category};
              `;
            const category_id = (await category_id_query)[0].category_id;

            return client.sql`
                INSERT INTO budgets (user_id, category_id, amount)
                VALUES (${user.user_id}, ${category_id}, ${user.budgets[category]})
                ON CONFLICT (user_id, category_id) DO NOTHING;
              `;
          }),
        );
      }),
    );

    console.log(`Seeded ${insertedBudgets.flat().length} budgets`);

    return {
      createTable,
      budgets: insertedBudgets,
    };
  } catch (error) {
    console.error('Error seeding budgets:', error);
    throw error;
  }
}

async function seedExpenses(client) {
  try {
    // Create the "expenses" table if it doesn't exist
    const createTable = await client.sql`
      CREATE TABLE IF NOT EXISTS expenses (
        expense_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
        category_id INT REFERENCES categories(category_id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        PRIMARY KEY (user_id, category_id, expense_id)
      );
    `;

    console.log(`Created "expenses" table`);

    // Insert data into the "expenses" table
    const insertedExpenses = await Promise.all(
      users.map(async (user) => {
        return Promise.all(
          user.expenses.map(async (expense) => {
            const category_id_query = await client.sql`
                SELECT category_id FROM categories WHERE name = ${expense.category};
              `;
            const category_id = (await category_id_query)[0].category_id;

            return client.sql`
                INSERT INTO expenses (user_id, category_id, amount, description, date)
                VALUES (${user.user_id}, ${category_id}, ${expense.amount}, ${expense.description}, ${expense.date})
                ON CONFLICT (user_id, category_id, expense_id) DO NOTHING;
              `;
          }),
        );
      }),
    );

    console.log(`Seeded ${insertedExpenses.flat().length} expenses`);

    return {
      createTable,
      expenses: insertedExpenses,
    };
  } catch (error) {
    console.error('Error seeding expenses:', error);
    throw error;
  }
}

async function main() {
  const client = await db.connect();

  await seedCategories(client);
  await seedUsers(client);
  await seedBudgets(client);
  await seedExpenses(client);

  await client.end();
}

main().catch((err) => {
  console.error(
    'An error occurred while attempting to seed the database:',
    err,
  );
});
