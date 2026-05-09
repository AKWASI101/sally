/**
 * Environment configuration.
 *
 * Loads .env from the project root (one level above /api)
 * and validates that all required variables are present.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const required = ['DATABASE_URL', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`✗ Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  mnotifyApiKey: process.env.MNOTIFY_API_KEY || '',
  momoNumber: process.env.MOMO_NUMBER || '',
  momoName: process.env.MOMO_NAME || '',
};
