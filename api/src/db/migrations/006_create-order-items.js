/**
 * Migration 006: Create the order_items table.
 *
 * Snapshots product name and price at time of order so the order record
 * remains accurate even if the product is later edited or archived.
 */

exports.up = (pgm) => {
  pgm.createTable('order_items', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    order_id: {
      type: 'uuid',
      notNull: true,
      references: '"orders"',
      onDelete: 'CASCADE',
    },
    product_id: {
      type: 'uuid',
      notNull: true,
      references: '"products"',
      onDelete: 'RESTRICT',
    },
    product_name: {
      type: 'varchar(200)',
      notNull: true,
    },
    product_price: {
      type: 'numeric(10,2)',
      notNull: true,
    },
    quantity: {
      type: 'integer',
      notNull: true,
    },
    subtotal: {
      type: 'numeric(10,2)',
      notNull: true,
    },
  });

  pgm.createIndex('order_items', 'order_id');
  pgm.createIndex('order_items', 'product_id');
};

exports.down = (pgm) => {
  pgm.dropTable('order_items');
};
