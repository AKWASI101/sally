/**
 * Rate limiter configurations.
 *
 * Per SRS §5.2:
 *   - Checkout endpoint:  10 req/min per IP
 *   - Login endpoint:      5 req/min per IP
 *   - Tracking endpoint:  20 req/min per IP
 *   - General API:        100 req/min per IP (catch-all)
 */

const rateLimit = require('express-rate-limit');

/**
 * Creates a rate limiter with a standard response format.
 */
const createLimiter = (windowMs, max, label) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: `Too many requests to ${label}. Please try again later.`,
    },
  });

// General API limiter — applied to all /api routes
const generalLimiter = createLimiter(60 * 1000, 100, 'API');

// Login — 5 requests per minute per IP
const loginLimiter = createLimiter(60 * 1000, 5, 'login');

// Checkout — 10 requests per minute per IP
const checkoutLimiter = createLimiter(60 * 1000, 10, 'checkout');

// Order tracking — 20 requests per minute per IP
const trackingLimiter = createLimiter(60 * 1000, 20, 'order tracking');

module.exports = {
  generalLimiter,
  loginLimiter,
  checkoutLimiter,
  trackingLimiter,
};
