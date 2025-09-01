const express = require('express');
const router = express.Router();
const controller = require('../controllers/flashingController');

router.post('/create', controller.createFlashing);

module.exports = router;
