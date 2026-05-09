/**
 * Admin Dashboard controller.
 *
 * Returns summary statistics for the admin dashboard (SRS §FR-ADM-DASH-01–04):
 *   - Total orders this month
 *   - Revenue this month (confirmed payments only)
 *   - Pending payment confirmations count
 *   - Open batches count
 *   - Pending actions feed (unconfirmed payments, oldest first)
 *   - Recent orders (last 10)
 *   - Open batch summaries with deadline countdowns
 */

const { query } = require('../../config/db');

/**
 * GET /api/v1/admin/dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    // ── FR-ADM-DASH-01: Summary cards ─────────────────
    const summaryResult = await query(`
      SELECT
        -- Orders this month
        (SELECT COUNT(*)::int
         FROM orders
         WHERE created_at >= date_trunc('month', CURRENT_DATE)
           AND fulfillment_status != 'cancelled'
        ) AS orders_this_month,

        -- Revenue this month (confirmed payments only)
        (SELECT COALESCE(SUM(total), 0)
         FROM orders
         WHERE created_at >= date_trunc('month', CURRENT_DATE)
           AND payment_status = 'confirmed'
           AND fulfillment_status != 'cancelled'
        ) AS revenue_this_month,

        -- Pending payment confirmations
        (SELECT COUNT(*)::int
         FROM orders
         WHERE payment_status = 'pending'
           AND fulfillment_status != 'cancelled'
        ) AS pending_payments,

        -- Open batches
        (SELECT COUNT(*)::int
         FROM batches
         WHERE status = 'open'
        ) AS open_batches
    `);

    const summary = summaryResult.rows[0];

    // ── FR-ADM-DASH-02: Pending actions feed ──────────
    const { rows: pendingActions } = await query(`
      SELECT o.id, o.reference, o.customer_name, o.customer_phone,
             o.total, o.momo_reference, o.created_at
      FROM orders o
      WHERE o.payment_status = 'pending'
        AND o.fulfillment_status != 'cancelled'
      ORDER BY o.created_at ASC
      LIMIT 20
    `);

    // ── FR-ADM-DASH-03: Recent orders ─────────────────
    const { rows: recentOrders } = await query(`
      SELECT o.id, o.reference, o.customer_name, o.customer_phone,
             o.total, o.payment_status, o.fulfillment_status, o.created_at,
             (SELECT COUNT(*)::int FROM order_items WHERE order_id = o.id) AS item_count
      FROM orders o
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    // ── FR-ADM-DASH-04: Batch status overview ─────────
    const { rows: openBatches } = await query(`
      SELECT b.*,
             COALESCE(agg.order_count, 0)::int AS order_count,
             COALESCE(agg.total_value, 0) AS total_value,
             COALESCE(agg.confirmed_count, 0)::int AS confirmed_count,
             COALESCE(agg.pending_count, 0)::int AS pending_count
      FROM batches b
      LEFT JOIN (
        SELECT
          p.batch_id,
          COUNT(DISTINCT o.id) AS order_count,
          SUM(o.total) AS total_value,
          COUNT(DISTINCT o.id) FILTER (WHERE o.payment_status = 'confirmed') AS confirmed_count,
          COUNT(DISTINCT o.id) FILTER (WHERE o.payment_status = 'pending') AS pending_count
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE p.batch_id IS NOT NULL
          AND o.fulfillment_status != 'cancelled'
        GROUP BY p.batch_id
      ) agg ON agg.batch_id = b.id
      WHERE b.status = 'open'
      ORDER BY b.order_deadline ASC
    `);

    return res.json({
      success: true,
      data: {
        summary: {
          orders_this_month: summary.orders_this_month,
          revenue_this_month: summary.revenue_this_month,
          pending_payments: summary.pending_payments,
          open_batches: summary.open_batches,
        },
        pending_actions: pendingActions,
        recent_orders: recentOrders,
        open_batches: openBatches,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
