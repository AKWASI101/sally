/**
 * Admin Batch controller.
 *
 * Handles CRUD for shipment batches and the business rule:
 * closing a batch deactivates all linked preorder products (SRS §FR-ADM-BATCH-04).
 */

const { query, pool } = require('../../config/db');
const logger = require('../../utils/logger');

// Valid batch status values (from enum)
const VALID_STATUSES = ['open', 'closed', 'shipped', 'arrived', 'fulfilled'];

/**
 * GET /api/v1/admin/batches
 *
 * Returns all batches ordered by creation date (newest first),
 * with counts of associated orders and their total value.
 */
const list = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        b.*,
        COALESCE(agg.order_count, 0)::int   AS order_count,
        COALESCE(agg.total_value,  0)        AS total_value
      FROM batches b
      LEFT JOIN (
        SELECT
          oi.batch_id,
          COUNT(DISTINCT o.id)  AS order_count,
          SUM(o.total)          AS total_value
        FROM orders o
        JOIN order_items oi_link ON oi_link.order_id = o.id
        JOIN products p          ON p.id = oi_link.product_id
        LEFT JOIN LATERAL (SELECT p.batch_id) oi ON true
        WHERE p.batch_id IS NOT NULL
        GROUP BY oi.batch_id
      ) agg ON agg.batch_id = b.id
      ORDER BY b.created_at DESC
    `);

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/batches
 *
 * Body: { name, order_deadline, estimated_arrival, notes? }
 */
const create = async (req, res, next) => {
  try {
    const { name, order_deadline, estimated_arrival, notes } = req.body;

    // ── Validation ────────────────────────────────────
    if (!name || !order_deadline || !estimated_arrival) {
      return res.status(400).json({
        success: false,
        message: 'name, order_deadline, and estimated_arrival are required.',
      });
    }

    if (new Date(estimated_arrival) <= new Date(order_deadline)) {
      return res.status(400).json({
        success: false,
        message: 'estimated_arrival must be after order_deadline.',
      });
    }

    const { rows } = await query(
      `INSERT INTO batches (name, order_deadline, estimated_arrival, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), order_deadline, estimated_arrival, notes || null]
    );

    logger.info('Batch created', { batchId: rows[0].id, name: rows[0].name });

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/batches/:id
 *
 * Body: any of { name, order_deadline, estimated_arrival, notes, status }
 *
 * Business rule: when status is changed to 'closed', all preorder products
 * linked to this batch are deactivated (is_active = false).
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, order_deadline, estimated_arrival, notes, status } = req.body;

    // Verify batch exists
    const existing = await query('SELECT * FROM batches WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found.',
      });
    }

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    // Build dynamic SET clause — only update provided fields
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (order_deadline !== undefined) {
      fields.push(`order_deadline = $${idx++}`);
      values.push(order_deadline);
    }
    if (estimated_arrival !== undefined) {
      fields.push(`estimated_arrival = $${idx++}`);
      values.push(estimated_arrival);
    }
    if (notes !== undefined) {
      fields.push(`notes = $${idx++}`);
      values.push(notes);
    }
    if (status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(status);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields provided to update.',
      });
    }

    fields.push(`updated_at = now()`);
    values.push(id);

    const { rows } = await query(
      `UPDATE batches SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    // ── Business rule: closing a batch deactivates linked products ──
    if (status === 'closed') {
      const deactivated = await query(
        `UPDATE products SET is_active = false, updated_at = now()
         WHERE batch_id = $1 AND type = 'preorder' AND is_active = true
         RETURNING id, name`,
        [id]
      );
      logger.info('Batch closed — deactivated linked products', {
        batchId: id,
        deactivatedCount: deactivated.rows.length,
        products: deactivated.rows.map((p) => p.name),
      });
    }

    logger.info('Batch updated', { batchId: id });

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/batches/:id/orders
 *
 * Returns all orders that contain at least one preorder product
 * linked to this batch, with a summary of payment statuses.
 */
const listOrders = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify batch exists
    const batch = await query('SELECT id FROM batches WHERE id = $1', [id]);
    if (batch.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found.',
      });
    }

    const { rows } = await query(
      `SELECT DISTINCT o.*
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p     ON p.id = oi.product_id
       WHERE p.batch_id = $1
       ORDER BY o.created_at DESC`,
      [id]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/batches/:id/export
 *
 * Exports a CSV of all orders in a batch — customer name, phone,
 * delivery region, address, items ordered, and payment status.
 * Supports courier handoff (SRS §FR-ADM-BATCH-06).
 */
const exportCSV = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify batch exists
    const batch = await query('SELECT id, name FROM batches WHERE id = $1', [id]);
    if (batch.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found.',
      });
    }

    // Get all orders with items in this batch
    const { rows } = await query(
      `SELECT
         o.reference,
         o.customer_name,
         o.customer_phone,
         o.delivery_region,
         o.delivery_address,
         o.payment_status,
         o.fulfillment_status,
         o.total,
         string_agg(
           oi.product_name || ' x' || oi.quantity,
           '; ' ORDER BY oi.product_name
         ) AS items_summary
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p     ON p.id = oi.product_id
       WHERE p.batch_id = $1
       GROUP BY o.id
       ORDER BY o.created_at ASC`,
      [id]
    );

    // Build CSV
    const headers = [
      'Order Reference',
      'Customer Name',
      'Phone',
      'Region',
      'Address',
      'Items',
      'Total (GHS)',
      'Payment Status',
      'Fulfillment Status',
    ];

    const escapeCSV = (val) => {
      const str = String(val || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [headers.join(',')];
    for (const row of rows) {
      csvRows.push([
        escapeCSV(row.reference),
        escapeCSV(row.customer_name),
        escapeCSV(row.customer_phone),
        escapeCSV(row.delivery_region),
        escapeCSV(row.delivery_address),
        escapeCSV(row.items_summary),
        escapeCSV(row.total),
        escapeCSV(row.payment_status),
        escapeCSV(row.fulfillment_status),
      ].join(','));
    }

    const csv = csvRows.join('\n');
    const batchName = batch.rows[0].name.replace(/[^a-zA-Z0-9]/g, '_');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${batchName}_orders.csv"`);
    return res.send(csv);
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, listOrders, exportCSV };
