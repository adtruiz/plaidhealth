require('dotenv').config();
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  console.log('🔧 Fixing ehr_connections table schema...\n');

  try {
    // First, check what tables exist
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log('Existing tables:', tables.rows.map(r => r.table_name).join(', '));

    // Check if ehr_connections exists
    const ehrExists = tables.rows.some(r => r.table_name === 'ehr_connections');

    if (ehrExists) {
      console.log('\n✓ ehr_connections table exists');

      // Check current schema
      const cols = await pool.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'ehr_connections' AND column_name = 'patient_id'
      `);

      if (cols.rows.length > 0) {
        const currentLength = cols.rows[0].character_maximum_length;
        console.log(`  Current patient_id length: VARCHAR(${currentLength})`);

        if (currentLength < 255) {
          console.log('\n→ Updating patient_id to VARCHAR(255)...');
          await pool.query(`ALTER TABLE ehr_connections ALTER COLUMN patient_id TYPE VARCHAR(255)`);
          console.log('✅ Updated to VARCHAR(255)');
        } else {
          console.log('✅ Already VARCHAR(255)');
        }
      }

      // Also add provider column if it doesn't exist
      const providerCol = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'ehr_connections' AND column_name = 'provider'
      `);

      if (providerCol.rows.length === 0) {
        console.log('\n→ Adding provider column...');
        await pool.query(`ALTER TABLE ehr_connections ADD COLUMN provider VARCHAR(50) DEFAULT 'epic'`);
        console.log('✅ Added provider column');
      }

    } else {
      console.log('\n→ ehr_connections table does not exist, creating it...');

      // Create the table with correct schema
      await pool.query(`
        CREATE TABLE ehr_connections (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          provider VARCHAR(50) NOT NULL DEFAULT 'epic',
          patient_id VARCHAR(255) NOT NULL,
          access_token TEXT NOT NULL,
          refresh_token TEXT,
          token_expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT ehr_connections_user_provider_patient_unique UNIQUE(user_id, provider, patient_id)
        )
      `);
      console.log('✅ Created ehr_connections table');
    }

    // Verify final state
    const finalCols = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'ehr_connections'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 Final ehr_connections schema:');
    finalCols.rows.forEach(col => {
      const type = col.character_maximum_length
        ? `${col.data_type}(${col.character_maximum_length})`
        : col.data_type;
      console.log(`  - ${col.column_name}: ${type}`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

fix()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });
