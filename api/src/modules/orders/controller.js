/**
 * Public Order controller.
 *
 * Handles the customer-facing order flow:
 *   - Place order (with full DB transaction)
 *   - Submit MoMo reference
 *   - Track order status
 *
 * Critical: Order creation is a single atomic DB transaction.
 * If any insert fails, everything rolls back including stock decrements.
 */

const { pool, query } = require('../../config/db');
const logger = require('../../utils/logger');
const { notifyOrderPlaced, notifyAdminNewOrder } = require('../notifications/sms');

// Ghana regions for delivery_region validation
const GHANA_REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Eastern',
  'Central',
  'Northern',
  'Volta',
  'Upper East',
  'Upper West',
  'Bono',
  'Bono East',
  'Ahafo',
  'Western North',
  'Oti',
  'North East',
  'Savannah',
];

/**
 * POST /api/v1/orders
 *
 * Body: {
 *   customer_name, customer_phone, delivery_region, delivery_address,
 *   order_note?, delivery_fee?,
 *   items: [{ product_id, quantity }]
 * }
 *
 * The entire operation runs inside a single PostgreSQL transaction.
 */
const placeOrder = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const {
      customer_name,
      customer_phone,
      delivery_region,
      delivery_address,
      order_note,
      delivery_fee = 0,
      items,
    } = req.body;

    // ── Input validation ─────────────────────────────
    if (!customer_name || !customer_phone || !delivery_region || !delivery_address) {
      return res.status(400).json({
        success: false,
        message: 'customer_name, customer_phone, delivery_region, and delivery_address are required.',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'items array is required and must contain at least one item.',
      });
    }

    if (!GHANA_REGIONS.includes(delivery_region)) {
      return res.status(400).json({
        success: false,
        message: `Invalid delivery region. Must be one of: ${GHANA_REGIONS.join(', ')}`,
      });
    }

    // Validate phone format (Ghana: starts with 0, 10 digits)
    const phoneClean = customer_phone.replace(/\s+/g, '');
    if (!/^0\d{9}$/.test(phoneClean)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be a valid Ghana number (e.g. 0244000000).',
      });
    }

    // Validate each item has product_id and quantity
    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a valid product_id and quantity (>= 1).',
        });
      }
    }

    // ── BEGIN TRANSACTION ─────────────────────────────
    await client.query('BEGIN');

    // ── Validate all products and build order items ───
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const { rows: productRows } = await client.query(
        'SELECT * FROM products WHERE id = $1 FOR UPDATE',
        [item.product_id]
      );

      if (productRows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.product_id}`,
        });
      }

      const product = productRows[0];

      // Must be active
      if (!product.is_active) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Product "${product.name}" is no longer available.`,
        });
      }

      // Preorder: check batch deadline hasn't passed
      if (product.type === 'preorder' && product.batch_id) {
        const { rows: batchRows } = await client.query(
          'SELECT * FROM batches WHERE id = $1',
          [product.batch_id]
        );
        if (batchRows.length > 0) {
          const batch = batchRows[0];
          if (batch.status !== 'open') {
            await client.query('ROLLBACK');
            return res.status(400).json({
              success: false,
              message: `Preorder for "${product.name}" is closed — the batch deadline has passed.`,
            });
          }
          if (new Date(batch.order_deadline) < new Date()) {
            await client.query('ROLLBACK');
            return res.status(400).json({
              success: false,
              message: `Preorder deadline for "${product.name}" has passed.`,
            });
          }
        }
      }

      // In-stock: check sufficient quantity
      if (product.type === 'in_stock') {
        if (product.stock_quantity < item.quantity) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${product.name}". Available: ${product.stock_quantity}, requested: ${item.quantity}.`,
          });
        }

        // Decrement stock (inside transaction — rolls back on failure)
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = now() WHERE id = $2',
          [item.quantity, product.id]
        );
      }

      const itemSubtotal = parseFloat(product.price) * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_price: parseFloat(product.price),
        quantity: item.quantity,
        subtotal: itemSubtotal,
      });
    }

    const total = subtotal + parseFloat(delivery_fee);

    // ── Generate collision-safe order reference ───────
    const { rows: seqRows } = await client.query(
      "SELECT nextval('order_ref_seq') AS seq"
    );
    const seqNum = seqRows[0].seq;
    const year = new Date().getFullYear();
    const reference = `SAL-${year}-${String(seqNum).padStart(5, '0')}`;

    // ── Insert order ─────────────────────────────────
    const { rows: orderRows } = await client.query(
      `INSERT INTO orders
         (reference, customer_name, customer_phone, delivery_region,
          delivery_address, order_note, subtotal, delivery_fee, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        reference,
        customer_name.trim(),
        phoneClean,
        delivery_region,
        delivery_address.trim(),
        order_note || null,
        subtotal,
        parseFloat(delivery_fee),
        total,
      ]
    );

    const order = orderRows[0];

    // ── Insert order items ───────────────────────────
    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items
           (order_id, product_id, product_name, product_price, quantity, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          order.id,
          item.product_id,
          item.product_name,
          item.product_price,
          item.quantity,
          item.subtotal,
        ]
      );
    }

    // ── Insert initial status log entry ──────────────
    await client.query(
      `INSERT INTO order_status_log (order_id, status, note)
       VALUES ($1, $2, $3)`,
      [order.id, 'pending_payment', 'Order placed by customer.']
    );

    // ── COMMIT TRANSACTION ───────────────────────────
    await client.query('COMMIT');

    logger.info('Order placed successfully', {
      reference: order.reference,
      customer: order.customer_name,
      total: order.total,
      itemCount: orderItems.length,
    });

    // ── Fire-and-forget SMS notifications ─────────────
    // These run AFTER commit — failures don't affect the order
    notifyOrderPlaced(order).catch(() => {});
    notifyAdminNewOrder(order).catch(() => {});

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      data: {
        reference: order.reference,
        total: order.total,
        subtotal: order.subtotal,
        delivery_fee: order.delivery_fee,
        items: orderItems,
        payment_status: order.payment_status,
        fulfillment_status: order.fulfillment_status,
        created_at: order.created_at,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/v1/orders/:ref/momo
 *
 * Body: { momo_reference }
 *
 * Allows the customer to submit their MoMo transaction reference
 * after paying. Can be called from the confirmation page or tracking page.
 */
const submitMomoReference = async (req, res, next) => {
  try {
    const { ref } = req.params;
    const { momo_reference } = req.body;

    if (!momo_reference || momo_reference.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'momo_reference is required.',
      });
    }

    const { rows } = await query(
      `UPDATE orders
       SET momo_reference = $1, updated_at = now()
       WHERE reference = $2
       RETURNING reference, momo_reference, payment_status`,
      [momo_reference.trim(), ref.toUpperCase()]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    logger.info('MoMo reference submitted', {
      reference: ref,
      momoRef: momo_reference,
    });

    return res.json({
      success: true,
      message: 'MoMo reference submitted successfully.',
      data: rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/orders/track?phone=0244000000&ref=SAL-2026-00001
 *
 * Public order tracking. Requires both phone and reference to
 * prevent enumeration of other customers' orders.
 */
const trackOrder = async (req, res, next) => {
  try {
    const { phone, ref } = req.query;

    if (!phone || !ref) {
      return res.status(400).json({
        success: false,
        message: 'Both phone and ref query parameters are required.',
      });
    }

    const phoneClean = phone.replace(/\s+/g, '');

    // ── Fetch the order ──────────────────────────────
    const { rows: orderRows } = await query(
      `SELECT id, reference, customer_name, customer_phone,
              delivery_region, payment_status, fulfillment_status,
              momo_reference, subtotal, delivery_fee, total, created_at
       FROM orders
       WHERE reference = $1 AND customer_phone = $2`,
      [ref.toUpperCase(), phoneClean]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found. Please check your phone number and order reference.',
      });
    }

    const order = orderRows[0];

    // ── Fetch order items with batch info ─────────────
    const { rows: itemRows } = await query(
      `SELECT oi.product_name, oi.product_price, oi.quantity, oi.subtotal,
              p.type AS product_type, b.name AS batch_name,
              b.estimated_arrival
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       LEFT JOIN batches b  ON b.id = p.batch_id
       WHERE oi.order_id = $1`,
      [order.id]
    );

    // ── Fetch status timeline ────────────────────────
    const { rows: timeline } = await query(
      `SELECT status, note, created_at
       FROM order_status_log
       WHERE order_id = $1
       ORDER BY created_at ASC`,
      [order.id]
    );

    return res.json({
      success: true,
      data: {
        reference: order.reference,
        customer_name: order.customer_name,
        payment_status: order.payment_status,
        fulfillment_status: order.fulfillment_status,
        momo_reference: order.momo_reference,
        subtotal: order.subtotal,
        delivery_fee: order.delivery_fee,
        total: order.total,
        created_at: order.created_at,
        items: itemRows,
        timeline,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { placeOrder, submitMomoReference, trackOrder };
