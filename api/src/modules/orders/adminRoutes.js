/**
 * Admin Order routes.
 *
 * All routes require JWT authentication.
 */

const { Router } = require('express');
const auth = require('../../middleware/auth');
const {
  list,
  detail,
  confirmPayment,
  updateStatus,
  addNote,
  cancel,
} = require('./adminController');

const router = Router();

router.use(auth);

router.get('/',                list);
router.get('/:id',             detail);
router.patch('/:id/payment',   confirmPayment);
router.patch('/:id/status',    updateStatus);
router.post('/:id/notes',      addNote);
router.delete('/:id',          cancel);

module.exports = router;
