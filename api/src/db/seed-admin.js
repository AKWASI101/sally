require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedAdmin() {
  const client = await pool.connect();
  try {
    const passwordHash = await bcrypt.hash('sally2026', 12);
    const { rows: [admin] } = await client.query(
      `INSERT INTO admin (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email`,
      ['admin@sally.com', passwordHash]
    );
    console.log('✓ Admin:', admin ? `created (${admin.email})` : 'already exists');
  } catch (err) {
    console.error('✗ Failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedAdmin();
