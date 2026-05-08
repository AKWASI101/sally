/**
 * Migration 005: Create the orders table.
 *
 * Orders capture customer info, payment status, and fulfillment pipeline.
 * The reference field (e.g. SAL-2026-00042) is the customer-facing identifier.
 */

exports.up = (pgm) => {
  pgm.createTable('orders', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    reference: {
      type: 'varchar(20)',
      notNull: true,
      unique: true,
    },
    customer_name: {
      type: 'varchar(200)',
      notNull: true,
    },
    customer_phone: {
      type: 'varchar(20)',
      notNull: true,
    },
    delivery_region: {
      type: 'varchar(100)',
      notNull: true,
    },
    delivery_address: {
      type: 'text',
      notNull: true,
    },
    order_note: {
      type: 'text',
    },
    payment_status: {
      type: 'payment_status',
      notNull: true,
      default: 'pending',
    },
    fulfillment_status: {
      type: 'fulfillment_status',
      notNull: true,
      default: 'pending_payment',
    },
    momo_reference: {
      type: 'varchar(100)',
    },
    subtotal: {
      type: 'numeric(10,2)',
      notNull: true,
    },
    delivery_fee: {
      type: 'numeric(10,2)',
      notNull: true,
      default: 0,
    },
    total: {
      type: 'numeric(10,2)',
      notNull: true,
    },
    cancelled_reason: {
      type: 'text',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Indexes for common admin queries
  pgm.createIndex('orders', 'customer_phone');
  pgm.createIndex('orders', 'payment_status');
  pgm.createIndex('orders', 'fulfillment_status');
  pgm.createIndex('orders', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('orders');
};
