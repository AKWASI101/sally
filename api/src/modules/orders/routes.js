/**
 * Public Order routes.
 *
 * These are customer-facing — no JWT auth required.
 * Rate limiters applied per SRS §5.2.
 */

const { Router } = require('express');
const { checkoutLimiter, trackingLimiter } = require('../../middleware/rateLimiter');
const { placeOrder, submitMomoReference, trackOrder } = require('./controller');

const router = Router();

router.post('/',            checkoutLimiter, placeOrder);
router.patch('/:ref/momo',  submitMomoReference);
router.get('/track',        trackingLimiter, trackOrder);

module.exports = router;
