/**
 * Admin authentication controller.
 *
 * Handles login — validates credentials and returns a JWT.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/db');
const env = require('../../config/env');
const logger = require('../../utils/logger');

/**
 * POST /api/v1/admin/auth/login
 *
 * Body: { email, password }
 * Returns: { success, token, admin: { id, email } }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // ── Validate input ────────────────────────────────
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    // ── Look up admin ─────────────────────────────────
    const { rows } = await query(
      'SELECT id, email, password_hash FROM admin WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      logger.warn('Login attempt with unknown email', { email });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const admin = rows[0];

    // ── Verify password ───────────────────────────────
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      logger.warn('Login attempt with wrong password', { email });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // ── Issue JWT ─────────────────────────────────────
    const token = jwt.sign(
      { adminId: admin.id, email: admin.email },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    logger.info('Admin logged in successfully', { email: admin.email });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      admin: {
        id: admin.id,
        email: admin.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { login };
