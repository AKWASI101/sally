/**
 * Winston logger — file + console transports.
 *
 * Logs are written to:
 *   - Console (colorized, all levels in dev; info+ in prod)
 *   - logs/error.log  (error level only)
 *   - logs/combined.log (all levels)
 *
 * Per SRS §5.3: "Application errors shall be logged with Winston (file + console transport)"
 */

const { createLogger, format, transports } = require('winston');
const path = require('path');

const logDir = path.resolve(__dirname, '../../logs');

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'sally-api' },
  transports: [
    // Error-only log file
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
    // Combined log file
    new transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
});

// In development, also log to console with colors
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length > 1 // > 1 because of 'service' default
            ? ` ${JSON.stringify(meta, null, 0)}`
            : '';
          return `${timestamp} ${level}: ${message}${metaStr}`;
        })
      ),
    })
  );
}

module.exports = logger;
