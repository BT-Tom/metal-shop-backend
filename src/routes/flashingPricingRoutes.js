const express = require('express');
const router = express.Router();
const controller = require('../controllers/flashingPricingController');
const { checkAdmin } = require('../controllers/authController');

// Public: get current pricing
router.get('/', controller.getPricing);

// Admin: update pricing
router.put('/', checkAdmin, controller.updatePricing);

module.exports = router;
