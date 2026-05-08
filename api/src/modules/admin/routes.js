/**
 * Admin authentication routes.
 *
 * POST /api/v1/admin/auth/login — Authenticate admin and return JWT.
 */

const { Router } = require('express');
const { loginLimiter } = require('../../middleware/rateLimiter');
const { login } = require('./controller');

const router = Router();

router.post('/auth/login', loginLimiter, login);

module.exports = router;
