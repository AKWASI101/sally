/**
 * Migration 008: Create the admin_notes table.
 *
 * Private internal notes that admin can attach to any order.
 * Not visible to customers.
 */

exports.up = (pgm) => {
  pgm.createTable('admin_notes', {
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
    note: {
      type: 'text',
      notNull: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.createIndex('admin_notes', 'order_id');
};

exports.down = (pgm) => {
  pgm.dropTable('admin_notes');
};
