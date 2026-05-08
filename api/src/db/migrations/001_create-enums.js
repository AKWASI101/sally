/**
 * Migration 001: Create all ENUM types used across the schema.
 *
 * category         — Product categories
 * product_type     — Preorder vs In-Stock
 * batch_status     — Lifecycle of a shipment batch
 * payment_status   — Whether payment has been confirmed
 * fulfillment_status — Order fulfillment pipeline
 */

exports.up = (pgm) => {
  pgm.createType('category', [
    'beauty_skincare',
    'fashion_clothing',
    'electronics_gadgets',
    'home_kitchen',
    'other',
  ]);

  pgm.createType('product_type', ['preorder', 'in_stock']);

  pgm.createType('batch_status', [
    'open',
    'closed',
    'shipped',
    'arrived',
    'fulfilled',
  ]);

  pgm.createType('payment_status', ['pending', 'confirmed']);

  pgm.createType('fulfillment_status', [
    'pending_payment',
    'payment_confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ]);
};

exports.down = (pgm) => {
  pgm.dropType('fulfillment_status');
  pgm.dropType('payment_status');
  pgm.dropType('batch_status');
  pgm.dropType('product_type');
  pgm.dropType('category');
};
