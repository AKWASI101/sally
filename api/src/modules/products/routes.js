/**
 * Admin Product routes.
 *
 * All routes require JWT authentication.
 * Image uploads handled by Multer middleware on create/update.
 */

const { Router } = require('express');
const auth = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const { list, create, update, archive } = require('./controller');

const router = Router();

router.use(auth);

router.get('/',       list);
router.post('/',      upload.array('images', 5), create);
router.patch('/:id',  upload.array('images', 5), update);
router.delete('/:id', archive);

module.exports = router;
