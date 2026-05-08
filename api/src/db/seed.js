/**
 * Seed script for Sally development database.
 *
 * Inserts:
 * - 1 admin user (admin@sally.com / sally2026)
 * - 1 batch (open, deadline 2 weeks out)
 * - 2 products (1 preorder linked to batch, 1 in-stock)
 *
 * Usage: npm run seed
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── Admin ──────────────────────────────────────────────
    const passwordHash = await bcrypt.hash('sally2026', 12);

    const { rows: [admin] } = await client.query(
      `INSERT INTO admin (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email`,
      ['admin@sally.com', passwordHash]
    );
    console.log('✓ Admin:', admin ? admin.email : '(already exists)');

    // ── Batch ──────────────────────────────────────────────
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 14); // 2 weeks from now

    const arrivalDate = new Date();
    arrivalDate.setDate(arrivalDate.getDate() + 42); // ~6 weeks from now

    const { rows: [batch] } = await client.query(
      `INSERT INTO batches (name, status, order_deadline, estimated_arrival, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name`,
      [
        'May 2026 Shipment',
        'open',
        deadlineDate.toISOString().split('T')[0],
        arrivalDate.toISOString().split('T')[0],
        'First batch — beauty and skincare essentials from Korea and Japan.',
      ]
    );
    console.log('✓ Batch:', batch.name, `(id: ${batch.id})`);

    // ── Product 1: Preorder ────────────────────────────────
    const { rows: [product1] } = await client.query(
      `INSERT INTO products (name, description, category, type, price, batch_id, images, is_featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, type`,
      [
        'Vitamin C Brightening Serum',
        'A potent 20% Vitamin C serum that brightens skin tone, fades dark spots, and boosts collagen production. Imported from South Korea. 30ml bottle.',
        'beauty_skincare',
        'preorder',
        85.00,
        batch.id,
        JSON.stringify([]),
        true,
      ]
    );
    console.log('✓ Product:', product1.name, `(${product1.type})`);

    // ── Product 2: In-Stock ────────────────────────────────
    const { rows: [product2] } = await client.query(
      `INSERT INTO products (name, description, category, type, price, stock_quantity, images, is_featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, type`,
      [
        'Digital Air Fryer 4.5L',
        'Compact digital air fryer with 8 preset cooking modes. 4.5L capacity, perfect for a family of 4. Non-stick basket, easy to clean. 1-year warranty.',
        'home_kitchen',
        'in_stock',
        420.00,
        5,
        JSON.stringify([]),
        true,
      ]
    );
    console.log('✓ Product:', product2.name, `(${product2.type})`);

    await client.query('COMMIT');
    console.log('\n✅ Seed completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
