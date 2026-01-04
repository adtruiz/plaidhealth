require('dotenv').config();
const { Pool } = require('pg');

// Create database connection
const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('🔧 Migrating patient_id column to support longer identifiers (emails)...');

  try {
    // Increase patient_id column length from VARCHAR(50) to VARCHAR(255)
    await pool.query(`
      ALTER TABLE ehr_connections
      ALTER COLUMN patient_id TYPE VARCHAR(255);
    `);

    console.log('✅ Migration complete: patient_id now supports up to 255 characters');
    console.log('   This allows emails like "ruiztadrian@gmail.com" as patient identifiers');

  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log('⚠️  ehr_connections table does not exist yet');
      console.log('   Table will be created with correct schema on first use');
    } else {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

migrate()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
