/**
 * Admin Order controller.
 *
 * Handles admin-side order management:
 *   - List with filters (status, payment, batch, date range)
 *   - Full order detail (items, status log, admin notes)
 *   - Confirm payment (with SMS notification)
 *   - Advance fulfillment status (validated pipeline)
 *   - Cancel order (with stock restoration for in-stock items)
 *   - Add internal notes
 */

const { query, pool } = require('../../config/db');
const logger = require('../../utils/logger');
const { notifyPaymentConfirmed, notifyOrderShipped } = require('../notifications/sms');

// The valid fulfillment pipeline — status can only advance forward
const FULFILLMENT_PIPELINE = [
  'pending_payment',
  'payment_confirmed',
  'processing',
  'shipped',
  'delivered',
];

/**
 * GET /api/v1/admin/orders
 *
 * Query params (all optional):
 *   status   — fulfillment_status filter
 *   payment  — payment_status filter ('pending' | 'confirmed')
 *   batch    — batch UUID (filters to orders containing products in that batch)
 *   from     — date range start (ISO date)
 *   to       — date range end (ISO date)
 *   page     — page number (default 1)
 *   limit    — items per page (default 20)
 */
const list = async (req, res, next) => {
  try {
    const {
      status,
      payment,
      batch,
      from,
      to,
      page = 1,
      limit = 20,
    } = req.query;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (status) {
      conditions.push(`o.fulfillment_status = $${idx++}`);
      values.push(status);
    }

    if (payment) {
      conditions.push(`o.payment_status = $${idx++}`);
      values.push(payment);
    }

    if (from) {
      conditions.push(`o.created_at >= $${idx++}`);
      values.push(from);
    }

    if (to) {
      conditions.push(`o.created_at <= ($${idx++})::date + interval '1 day'`);
      values.push(to);
    }

    // Batch filter requires a join
    let batchJoin = '';
    if (batch) {
      batchJoin = `
        JOIN order_items oi_batch ON oi_batch.order_id = o.id
        JOIN products p_batch ON p_batch.id = oi_batch.product_id`;
      conditions.push(`p_batch.batch_id = $${idx++}`);
      values.push(batch);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);
    const offset = (parsedPage - 1) * parsedLimit;

    // Count query
    const countResult = await query(
      `SELECT COUNT(DISTINCT o.id)::int AS total
       FROM orders o ${batchJoin} ${whereClause}`,
      values
    );

    // Main query
    const { rows } = await query(
      `SELECT DISTINCT o.*,
              (SELECT COUNT(*)::int FROM order_items WHERE order_id = o.id) AS item_count
       FROM orders o ${batchJoin} ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, parsedLimit, offset]
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: countResult.rows[0].total,
        pages: Math.ceil(countResult.rows[0].total / parsedLimit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/orders/:id
 *
 * Full order detail including items, status timeline, and admin notes.
 */
const detail = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch order
    const { rows: orderRows } = await query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const order = orderRows[0];

    // Fetch items with product type and batch info
    const { rows: items } = await query(
      `SELECT oi.*, p.type AS product_type, p.batch_id,
              b.name AS batch_name, b.estimated_arrival
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       LEFT JOIN batches b  ON b.id = p.batch_id
       WHERE oi.order_id = $1`,
      [id]
    );

    // Fetch status timeline
    const { rows: timeline } = await query(
      `SELECT id, status, note, created_at
       FROM order_status_log
       WHERE order_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    // Fetch admin notes
    const { rows: notes } = await query(
      `SELECT id, note, created_at
       FROM admin_notes
       WHERE order_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...order,
        items,
        timeline,
        admin_notes: notes,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/orders/:id/payment
 *
 * Confirms payment: sets payment_status to 'confirmed',
 * advances fulfillment_status to 'payment_confirmed',
 * logs the status change, and triggers SMS (FR-NOTIF-02).
 */
const confirmPayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows: orderRows } = await query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const order = orderRows[0];

    if (order.payment_status === 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Payment is already confirmed.',
      });
    }

    if (order.fulfillment_status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot confirm payment on a cancelled order.',
      });
    }

    // Update order
    const { rows: updated } = await query(
      `UPDATE orders
       SET payment_status = 'confirmed',
           fulfillment_status = 'payment_confirmed',
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Log status change
    await query(
      `INSERT INTO order_status_log (order_id, status, note)
       VALUES ($1, $2, $3)`,
      [id, 'payment_confirmed', 'Payment confirmed by admin.']
    );

    logger.info('Payment confirmed', { orderId: id, reference: order.reference });

    // Fire-and-forget SMS
    notifyPaymentConfirmed(updated[0]).catch(() => {});

    return res.json({
      success: true,
      message: 'Payment confirmed.',
      data: updated[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/orders/:id/status
 *
 * Body: { status, tracking_number? }
 *
 * Advances the fulfillment status along the pipeline.
 * Validates that steps cannot be skipped (e.g. cannot jump from
 * pending_payment directly to shipped).
 *
 * Triggers SMS notification when status is set to 'shipped' (FR-NOTIF-03).
 */
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, tracking_number } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'status is required.',
      });
    }

    if (!FULFILLMENT_PIPELINE.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${FULFILLMENT_PIPELINE.join(', ')}`,
      });
    }

    const { rows: orderRows } = await query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const order = orderRows[0];

    if (order.fulfillment_status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update status of a cancelled order.',
      });
    }

    // Validate pipeline — new status must be exactly the next step
    const currentIdx = FULFILLMENT_PIPELINE.indexOf(order.fulfillment_status);
    const targetIdx = FULFILLMENT_PIPELINE.indexOf(status);

    if (targetIdx <= currentIdx) {
      return res.status(400).json({
        success: false,
        message: `Cannot move from "${order.fulfillment_status}" to "${status}". Status can only advance forward.`,
      });
    }

    if (targetIdx !== currentIdx + 1) {
      const nextStatus = FULFILLMENT_PIPELINE[currentIdx + 1];
      return res.status(400).json({
        success: false,
        message: `Cannot skip steps. Current: "${order.fulfillment_status}". Next valid step: "${nextStatus}".`,
      });
    }

    // Update order
    const { rows: updated } = await query(
      `UPDATE orders
       SET fulfillment_status = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    // Log status change
    const note = tracking_number
      ? `Status advanced to ${status}. Tracking: ${tracking_number}`
      : `Status advanced to ${status}.`;

    await query(
      `INSERT INTO order_status_log (order_id, status, note)
       VALUES ($1, $2, $3)`,
      [id, status, note]
    );

    logger.info('Order status updated', {
      orderId: id,
      reference: order.reference,
      from: order.fulfillment_status,
      to: status,
    });

    // SMS on shipped (FR-NOTIF-03)
    if (status === 'shipped') {
      notifyOrderShipped(updated[0], tracking_number || null).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Order status updated to "${status}".`,
      data: updated[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/orders/:id/notes
 *
 * Body: { note }
 *
 * Adds a private internal note to the order (not visible to customers).
 */
const addNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || note.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'note is required.',
      });
    }

    // Verify order exists
    const order = await query('SELECT id FROM orders WHERE id = $1', [id]);
    if (order.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const { rows } = await query(
      `INSERT INTO admin_notes (order_id, note)
       VALUES ($1, $2)
       RETURNING *`,
      [id, note.trim()]
    );

    logger.info('Admin note added', { orderId: id });

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/admin/orders/:id
 *
 * Body: { reason }
 *
 * Cancels an order. Requires a reason note.
 * Restores stock_quantity for any in-stock items in the order.
 * Uses a DB transaction to ensure atomicity.
 */
const cancel = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A cancellation reason is required.',
      });
    }

    await client.query('BEGIN');

    const { rows: orderRows } = await client.query(
      'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (orderRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    const order = orderRows[0];

    if (order.fulfillment_status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled.',
      });
    }

    if (order.fulfillment_status === 'delivered') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a delivered order.',
      });
    }

    // Restore stock for in-stock items
    const { rows: items } = await client.query(
      `SELECT oi.product_id, oi.quantity, p.type
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
      [id]
    );

    for (const item of items) {
      if (item.type === 'in_stock') {
        await client.query(
          `UPDATE products
           SET stock_quantity = stock_quantity + $1, updated_at = now()
           WHERE id = $2`,
          [item.quantity, item.product_id]
        );
      }
    }

    // Update order status
    await client.query(
      `UPDATE orders
       SET fulfillment_status = 'cancelled',
           cancelled_reason = $1,
           updated_at = now()
       WHERE id = $2`,
      [reason.trim(), id]
    );

    // Log the cancellation
    await client.query(
      `INSERT INTO order_status_log (order_id, status, note)
       VALUES ($1, $2, $3)`,
      [id, 'cancelled', `Order cancelled. Reason: ${reason.trim()}`]
    );

    await client.query('COMMIT');

    logger.info('Order cancelled', {
      orderId: id,
      reference: order.reference,
      reason: reason.trim(),
      stockRestored: items.filter((i) => i.type === 'in_stock').length,
    });

    // Fetch the updated order to return
    const { rows: updated } = await query('SELECT * FROM orders WHERE id = $1', [id]);

    return res.json({
      success: true,
      message: 'Order cancelled.',
      data: updated[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { list, detail, confirmPayment, updateStatus, addNote, cancel };
