/**
 * Migration 002: Create the admin table.
 *
 * Single admin user (Alberta). JWT auth, hashed passwords.
 */

exports.up = (pgm) => {
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  pgm.createTable('admin', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    email: {
      type: 'varchar(200)',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'varchar(200)',
      notNull: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('admin');
};
