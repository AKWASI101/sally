/**
 * JWT authentication middleware.
 *
 * Verifies the Bearer token from the Authorization header,
 * looks up the admin user, and attaches it to req.admin.
 *
 * Used on all /api/v1/admin/* routes (except login).
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../config/db');
const logger = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please log in again.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    // Verify the admin still exists in the database
    const { rows } = await query(
      'SELECT id, email FROM admin WHERE id = $1',
      [decoded.adminId]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Admin account not found.',
      });
    }

    req.admin = rows[0];
    next();
  } catch (err) {
    logger.error('Auth middleware error', { error: err.message });
    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
    });
  }
};

module.exports = authMiddleware;
