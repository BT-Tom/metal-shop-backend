const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const bodyParser = require('body-parser');

router.post('/create-checkout-session', paymentController.createCheckoutSession);
// Stripe webhook expects raw body for signature verification
router.post('/webhook', bodyParser.raw({ type: 'application/json' }), paymentController.webhook);

module.exports = router;
