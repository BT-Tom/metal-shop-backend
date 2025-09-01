const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

router.get('/', cartController.getByUser);
router.post('/add', cartController.addItem);
router.post('/update', cartController.updateItem);
router.post('/remove', cartController.removeItem);
router.post('/clear', cartController.clearCart);

module.exports = router;