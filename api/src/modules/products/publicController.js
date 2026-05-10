/**
 * Public Product controller.
 *
 * Serves product & batch data to the customer-facing storefront.
 * No authentication required. Only active products are exposed.
 */

const { query } = require('../../config/db');

const VALID_CATEGORIES = [
  'beauty_skincare',
  'fashion_clothing',
  'electronics_gadgets',
  'home_kitchen',
  'other',
];
const VALID_TYPES = ['preorder', 'in_stock'];

/**
 * GET /api/v1/products
 *
 * Query params (all optional):
 *   type      — 'preorder' | 'in_stock'
 *   category  — category slug
 *   featured  — 'true' to filter featured only
 *   page      — default 1
 *   limit     — default 20
 */
const publicList = async (req, res, next) => {
  try {
    const {
      type,
      category,
      featured,
      page = 1,
      limit = 20,
    } = req.query;

    const conditions = ['p.is_active = true'];
    const values = [];
    let idx = 1;

    if (type && VALID_TYPES.includes(type)) {
      conditions.push(`p.type = $${idx++}`);
      values.push(type);
    }
    if (category && VALID_CATEGORIES.includes(category)) {
      conditions.push(`p.category = $${idx++}`);
      values.push(category);
    }
    if (featured === 'true') {
      conditions.push(`p.is_featured = true`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (parsedPage - 1) * parsedLimit;

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM products p ${where}`,
      values
    );

    const { rows } = await query(
      `SELECT p.id, p.name, p.description, p.category, p.type, p.price,
              p.stock_quantity, p.images, p.is_featured, p.batch_id,
              b.name AS batch_name, b.order_deadline, b.estimated_arrival, b.status AS batch_status
       FROM products p
       LEFT JOIN batches b ON b.id = p.batch_id
       ${where}
       ORDER BY p.is_featured DESC, p.created_at DESC
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
 * GET /api/v1/products/:id
 */
const publicDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT p.id, p.name, p.description, p.category, p.type, p.price,
              p.stock_quantity, p.images, p.is_featured, p.batch_id,
              b.name AS batch_name, b.order_deadline, b.estimated_arrival, b.status AS batch_status
       FROM products p
       LEFT JOIN batches b ON b.id = p.batch_id
       WHERE p.id = $1 AND p.is_active = true`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/products/batches
 *
 * Returns all open batches for the storefront homepage.
 */
const publicBatches = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT b.id, b.name, b.order_deadline, b.estimated_arrival, b.status,
              COUNT(p.id)::int AS product_count
       FROM batches b
       LEFT JOIN products p ON p.batch_id = b.id AND p.is_active = true
       WHERE b.status = 'open' AND b.order_deadline >= CURRENT_DATE
       GROUP BY b.id
       ORDER BY b.order_deadline ASC`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { publicList, publicDetail, publicBatches };
