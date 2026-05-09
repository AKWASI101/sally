/**
 * Admin Batch routes.
 *
 * All routes require JWT authentication.
 */

const { Router } = require('express');
const auth = require('../../middleware/auth');
const { list, create, update, listOrders } = require('./controller');

const router = Router();

router.use(auth);

router.get('/',          list);
router.post('/',         create);
router.patch('/:id',     update);
router.get('/:id/orders', listOrders);

module.exports = router;
