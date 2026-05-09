/**
 * Sally API — Application entry point.
 *
 * Wires up Express with all middleware, routes, and starts the server.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Load env FIRST — before anything else imports config
const env = require('./config/env');
const logger = require('./utils/logger');
const { pool } = require('./config/db');
const { generalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Route modules
const adminRoutes = require('./modules/admin/routes');
const batchRoutes = require('./modules/batches/routes');
const productRoutes = require('./modules/products/routes');

// Ensure upload directories exist
const uploadsDir = path.resolve(__dirname, '../uploads/products');
fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();

// ── Security headers (SRS §5.2) ──────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────
app.use(cors({
  origin: env.nodeEnv === 'production'
    ? [/* production domains will go here */]
    : '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing ─────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── General rate limiter ─────────────────────────────────
app.use('/api', generalLimiter);

// ── Static file serving for uploads ──────────────────────
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// ── Health check ─────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    message: 'Sally API is running.',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
  });
});

// ── API routes ───────────────────────────────────────────
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/admin/batches', batchRoutes);
app.use('/api/v1/admin/products', productRoutes);

// ── 404 handler ──────────────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ── Global error handler ─────────────────────────────────
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────
const PORT = env.port;

const startServer = async () => {
  try {
    // Verify database connectivity before starting
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('Database connection verified');

    app.listen(PORT, () => {
      logger.info(`Sally API running on port ${PORT}`, {
        environment: env.nodeEnv,
        port: PORT,
      });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
};

startServer();

// ── Graceful shutdown ────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  await pool.end();
  logger.info('Database pool closed');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
