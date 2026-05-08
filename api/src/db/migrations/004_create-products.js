/**
 * Migration 004: Create the products table.
 *
 * Products can be either preorder (linked to a batch) or in-stock (tracked by quantity).
 * Images are stored as a JSONB array of file paths.
 */

exports.up = (pgm) => {
  pgm.createTable('products', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(200)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    category: {
      type: 'category',
      notNull: true,
      default: 'other',
    },
    type: {
      type: 'product_type',
      notNull: true,
    },
    price: {
      type: 'numeric(10,2)',
      notNull: true,
    },
    stock_quantity: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    batch_id: {
      type: 'uuid',
      references: '"batches"',
      onDelete: 'SET NULL',
    },
    images: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'[]'::jsonb"),
    },
    is_featured: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
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

  // Index for filtering by type and category on the public storefront
  pgm.createIndex('products', 'type');
  pgm.createIndex('products', 'category');
  pgm.createIndex('products', 'batch_id');
  pgm.createIndex('products', 'is_active');
};

exports.down = (pgm) => {
  pgm.dropTable('products');
};
