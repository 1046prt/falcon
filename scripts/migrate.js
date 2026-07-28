const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  (() => {
    console.warn('WARNING: DATABASE_URL not set, using dev default');
    return 'postgresql://falcon:falcon_dev@localhost:5432/falcon';
  })();

async function migrate() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    const schemaPath = path.join(__dirname, '../database/init/001_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await client.query(schema);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
