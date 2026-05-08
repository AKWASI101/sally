/**
 * Migration 007: Create the order_status_log table.
 *
 * Records every status transition for an order, creating an audit trail
 * shown as a timeline on both the public tracking page and admin order detail.
 */

exports.up = (pgm) => {
  pgm.createTable('order_status_log', {
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
    status: {
      type: 'varchar(50)',
      notNull: true,
    },
    note: {
      type: 'text',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.createIndex('order_status_log', 'order_id');
};

exports.down = (pgm) => {
  pgm.dropTable('order_status_log');
};
