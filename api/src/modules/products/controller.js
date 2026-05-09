/**
 * Admin Product controller.
 *
 * Handles CRUD for products including:
 * - Multer image upload (up to 5 files)
 * - Preorder ↔ in-stock validation rules
 * - Featured count enforcement (max 8)
 * - Soft archive (is_active = false)
 */

const { query } = require('../../config/db');
const logger = require('../../utils/logger');
const path = require('path');
const fs = require('fs');

// Valid enum values matching the DB
const VALID_CATEGORIES = [
  'beauty_skincare',
  'fashion_clothing',
  'electronics_gadgets',
  'home_kitchen',
  'other',
];
const VALID_TYPES = ['preorder', 'in_stock'];
const MAX_FEATURED = 8;

/**
 * GET /api/v1/admin/products
 *
 * Query params (all optional):
 *   type     — 'preorder' | 'in_stock'
 *   category — one of the VALID_CATEGORIES
 *   status   — 'active' | 'archived' (defaults to 'active')
 *   page     — page number (default 1)
 *   limit    — items per page (default 20)
 */
const list = async (req, res, next) => {
  try {
    const {
      type,
      category,
      status = 'active',
      page = 1,
      limit = 20,
    } = req.query;

    const conditions = [];
    const values = [];
    let idx = 1;

    // Filter by active/archived status
    if (status === 'archived') {
      conditions.push(`p.is_active = false`);
    } else {
      conditions.push(`p.is_active = true`);
    }

    if (type && VALID_TYPES.includes(type)) {
      conditions.push(`p.type = $${idx++}`);
      values.push(type);
    }

    if (category && VALID_CATEGORIES.includes(category)) {
      conditions.push(`p.category = $${idx++}`);
      values.push(category);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);
    const offset = (parsedPage - 1) * parsedLimit;

    // Get count for pagination
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM products p ${whereClause}`,
      values
    );

    // Get products with batch name joined
    const { rows } = await query(
      `SELECT p.*, b.name AS batch_name
       FROM products p
       LEFT JOIN batches b ON b.id = p.batch_id
       ${whereClause}
       ORDER BY p.created_at DESC
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
 * POST /api/v1/admin/products
 *
 * Multipart form data (handled by Multer middleware in routes):
 *   name, description, category, type, price
 *   batch_id      (required if type=preorder)
 *   stock_quantity (required if type=in_stock)
 *   is_featured   ('true'/'false')
 *   images        (up to 5 files via field name "images")
 */
const create = async (req, res, next) => {
  try {
    const {
      name,
      description,
      category,
      type,
      price,
      batch_id,
      stock_quantity,
      is_featured,
    } = req.body;

    // ── Required field validation ──────────────────────
    if (!name || !type || !price) {
      return res.status(400).json({
        success: false,
        message: 'name, type, and price are required.',
      });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`,
      });
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
      });
    }

    if (parseFloat(price) <= 0 || isNaN(parseFloat(price))) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a positive number.',
      });
    }

    // ── Type-specific validation ──────────────────────
    if (type === 'preorder' && !batch_id) {
      return res.status(400).json({
        success: false,
        message: 'Preorder products must have a batch_id.',
      });
    }

    if (type === 'in_stock') {
      if (stock_quantity === undefined || stock_quantity === null || stock_quantity === '') {
        return res.status(400).json({
          success: false,
          message: 'In-stock products must have a stock_quantity.',
        });
      }
      if (parseInt(stock_quantity, 10) < 0 || isNaN(parseInt(stock_quantity, 10))) {
        return res.status(400).json({
          success: false,
          message: 'stock_quantity must be a non-negative integer.',
        });
      }
    }

    // If preorder, verify the batch exists and is open
    if (type === 'preorder') {
      const batch = await query(
        'SELECT id, status FROM batches WHERE id = $1',
        [batch_id]
      );
      if (batch.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'The specified batch does not exist.',
        });
      }
      if (batch.rows[0].status !== 'open') {
        return res.status(400).json({
          success: false,
          message: 'Cannot link a product to a batch that is not open.',
        });
      }
    }

    // ── Featured count enforcement (max 8) ────────────
    const wantsFeatured = is_featured === 'true' || is_featured === true;
    if (wantsFeatured) {
      const { rows: countRows } = await query(
        'SELECT COUNT(*)::int AS count FROM products WHERE is_featured = true AND is_active = true'
      );
      if (countRows[0].count >= MAX_FEATURED) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${MAX_FEATURED} featured products allowed.`,
        });
      }
    }

    // ── Build images array from uploaded files ────────
    const images = (req.files || []).map(
      (file) => `/uploads/products/${file.filename}`
    );

    // ── Insert ────────────────────────────────────────
    const { rows } = await query(
      `INSERT INTO products
         (name, description, category, type, price, stock_quantity, batch_id, images, is_featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        name.trim(),
        description || null,
        category || 'other',
        type,
        parseFloat(price),
        type === 'in_stock' ? parseInt(stock_quantity, 10) : 0,
        type === 'preorder' ? batch_id : null,
        JSON.stringify(images),
        wantsFeatured,
      ]
    );

    logger.info('Product created', {
      productId: rows[0].id,
      name: rows[0].name,
      type: rows[0].type,
    });

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/products/:id
 *
 * Accepts multipart form data. All fields optional.
 * New images are appended to existing images (unless existing_images is provided
 * to reorder/remove). Total images capped at 5.
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify product exists
    const existing = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const product = existing.rows[0];
    const {
      name,
      description,
      category,
      type,
      price,
      batch_id,
      stock_quantity,
      is_featured,
      existing_images, // JSON string array of paths to keep (for reorder/removal)
    } = req.body;

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
      });
    }

    // Validate type if provided
    const effectiveType = type || product.type;
    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`,
      });
    }

    // Type-specific validation
    if (effectiveType === 'preorder') {
      const effectiveBatchId = batch_id !== undefined ? batch_id : product.batch_id;
      if (!effectiveBatchId) {
        return res.status(400).json({
          success: false,
          message: 'Preorder products must have a batch_id.',
        });
      }
    }

    if (effectiveType === 'in_stock') {
      const effectiveStockQty = stock_quantity !== undefined
        ? stock_quantity
        : product.stock_quantity;
      if (effectiveStockQty === null || effectiveStockQty === '') {
        return res.status(400).json({
          success: false,
          message: 'In-stock products must have a stock_quantity.',
        });
      }
    }

    // Price validation if provided
    if (price !== undefined) {
      if (parseFloat(price) <= 0 || isNaN(parseFloat(price))) {
        return res.status(400).json({
          success: false,
          message: 'Price must be a positive number.',
        });
      }
    }

    // ── Featured count enforcement ────────────────────
    const wantsFeatured = is_featured === 'true' || is_featured === true;
    if (wantsFeatured && !product.is_featured) {
      const { rows: countRows } = await query(
        'SELECT COUNT(*)::int AS count FROM products WHERE is_featured = true AND is_active = true AND id != $1',
        [id]
      );
      if (countRows[0].count >= MAX_FEATURED) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${MAX_FEATURED} featured products allowed.`,
        });
      }
    }

    // ── Handle images ─────────────────────────────────
    let images;
    if (existing_images !== undefined) {
      // Admin is explicitly managing the image list (reorder/remove)
      images = JSON.parse(existing_images);
    } else {
      images = product.images || [];
    }

    // Append newly uploaded files
    const newImages = (req.files || []).map(
      (file) => `/uploads/products/${file.filename}`
    );
    images = [...images, ...newImages].slice(0, 5); // Cap at 5

    // ── Build dynamic update ──────────────────────────
    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(description);
    }
    if (category !== undefined) {
      fields.push(`category = $${idx++}`);
      values.push(category);
    }
    if (type !== undefined) {
      fields.push(`type = $${idx++}`);
      values.push(type);
    }
    if (price !== undefined) {
      fields.push(`price = $${idx++}`);
      values.push(parseFloat(price));
    }
    if (stock_quantity !== undefined) {
      fields.push(`stock_quantity = $${idx++}`);
      values.push(parseInt(stock_quantity, 10));
    }
    if (batch_id !== undefined) {
      fields.push(`batch_id = $${idx++}`);
      values.push(batch_id || null);
    }
    if (is_featured !== undefined) {
      fields.push(`is_featured = $${idx++}`);
      values.push(wantsFeatured);
    }

    // Always update images (may have new uploads)
    fields.push(`images = $${idx++}`);
    values.push(JSON.stringify(images));

    fields.push(`updated_at = now()`);
    values.push(id);

    const { rows } = await query(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    logger.info('Product updated', { productId: id });

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/admin/products/:id
 *
 * Soft archive — sets is_active = false.
 * Product remains in DB for existing order references (SRS §FR-ADM-PROD-04).
 */
const archive = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id, is_active FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    if (!existing.rows[0].is_active) {
      return res.status(400).json({
        success: false,
        message: 'Product is already archived.',
      });
    }

    const { rows } = await query(
      `UPDATE products
       SET is_active = false, is_featured = false, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    logger.info('Product archived', { productId: id, name: rows[0].name });

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, archive };
