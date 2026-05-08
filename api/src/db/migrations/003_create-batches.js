/**
 * Migration 003: Create the batches table.
 *
 * Batches group preorder items into shipments with deadlines and arrival dates.
 */

exports.up = (pgm) => {
  pgm.createTable('batches', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(200)',
      notNull: true,
    },
    status: {
      type: 'batch_status',
      notNull: true,
      default: 'open',
    },
    order_deadline: {
      type: 'date',
      notNull: true,
    },
    estimated_arrival: {
      type: 'date',
      notNull: true,
    },
    notes: {
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
};

exports.down = (pgm) => {
  pgm.dropTable('batches');
};
