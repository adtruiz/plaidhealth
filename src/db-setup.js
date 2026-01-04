require('dotenv').config();
const { Pool } = require('pg');

// Create database connection
console.log('📡 Connecting to database...');

// Check if we have DATABASE_URL, DATABASE_PUBLIC_URL, or individual PG variables
const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

if (databaseUrl) {
  console.log('   Using DATABASE_URL or DATABASE_PUBLIC_URL');
  console.log('   Connection string starts with:', databaseUrl.substring(0, 20));
  var pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });
} else if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
  console.log('   Using individual PG variables');
  console.log('   Host:', process.env.PGHOST);
  console.log('   Database:', process.env.PGDATABASE);
  console.log('   User:', process.env.PGUSER);

  var pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT || 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: { rejectUnauthorized: false }
  });
} else {
  console.error('❌ Database connection variables not set!');
  console.error('   Need either DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE');
  process.exit(1);
}

async function setupDatabase() {
  const client = await pool.connect();

  try {
    console.log('🔧 Setting up database schema...\n');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        profile_picture TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created users table');

    // Create epic_connections table
    await client.query(`
      CREATE TABLE IF NOT EXISTS epic_connections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        patient_id VARCHAR(255) NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, patient_id)
      );
    `);
    console.log('✅ Created epic_connections table');

    // Create sessions table for express-session
    await client.query(`
      CREATE TABLE IF NOT EXISTS session (
        sid VARCHAR NOT NULL COLLATE "default",
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL,
        PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
      );
    `);
    console.log('✅ Created session table');

    // Create index on session expiration
    await client.query(`
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
    `);
    console.log('✅ Created session index');

    // Create audit_logs table (for HIPAA compliance)
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created audit_logs table');

    console.log('\n🎉 Database schema setup complete!\n');

    // Show table counts
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM epic_connections) as connections,
        (SELECT COUNT(*) FROM session) as sessions,
        (SELECT COUNT(*) FROM audit_logs) as logs
    `);

    console.log('📊 Current counts:');
    console.log(`   Users: ${counts.rows[0].users}`);
    console.log(`   Epic Connections: ${counts.rows[0].connections}`);
    console.log(`   Sessions: ${counts.rows[0].sessions}`);
    console.log(`   Audit Logs: ${counts.rows[0].logs}`);
    console.log();

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run setup
setupDatabase()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to setup database:', err);
    process.exit(1);
  });
