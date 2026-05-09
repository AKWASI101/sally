/**
 * Migration 009: Create a sequence for collision-safe order reference generation.
 *
 * Order references follow the format SAL-YYYY-NNNNN (e.g. SAL-2026-00042).
 * Using a PostgreSQL sequence guarantees uniqueness even under concurrent inserts.
 */

exports.up = (pgm) => {
  pgm.createSequence('order_ref_seq', {
    start: 1,
    increment: 1,
    minvalue: 1,
  });
};

exports.down = (pgm) => {
  pgm.dropSequence('order_ref_seq');
};
