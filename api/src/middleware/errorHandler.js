/**
 * Global error handler middleware.
 *
 * Catches all unhandled errors from route handlers and middleware.
 * Logs the full error and returns a sanitised response to the client.
 */

const logger = require('../utils/logger');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Log the full error with request context
  logger.error(err.message, {
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    statusCode: err.statusCode || 500,
  });

  const statusCode = err.statusCode || 500;

  const response = {
    success: false,
    message: statusCode === 500
      ? 'An unexpected error occurred. Please try again later.'
      : err.message,
  };

  // In development, include the stack trace for debugging
  if (env.nodeEnv === 'development' && statusCode === 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
