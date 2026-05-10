/**
 * Public Product routes.
 *
 * No authentication required. Serves active products and batch info
 * for the customer-facing storefront.
 */

const { Router } = require('express');
const { publicList, publicDetail, publicBatches } = require('./publicController');

const router = Router();

router.get('/',        publicList);
router.get('/batches', publicBatches);
router.get('/:id',     publicDetail);

module.exports = router;
