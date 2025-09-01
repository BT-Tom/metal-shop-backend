// Catch-all logger for debugging (must be after router is defined)
console.log('variantRoutes.js loaded');
const express = require('express');
const router = express.Router();
const variantController = require('../controllers/variantController');
const multer = require('multer');
const upload = multer({ dest: 'public/images/' });
const { checkAdmin } = require('../controllers/authController');

// More specific route must come first
// More specific route must come first
router.get('/item/:item_id', (req, res, next) => {
	console.log('HIT /api/variants/item/:item_id', req.params.item_id);
	return variantController.getByItemId(req, res, next);
});
router.get('/:id', variantController.getById);
router.post('/', checkAdmin, upload.single('image'), variantController.create);
router.put('/:id', checkAdmin, upload.single('image'), variantController.update);
router.delete('/:id', checkAdmin, variantController.delete);

router.use((req, res, next) => {
  console.log('VARIANT ROUTER CAUGHT:', req.method, req.originalUrl);
  next();
});

module.exports = router;
