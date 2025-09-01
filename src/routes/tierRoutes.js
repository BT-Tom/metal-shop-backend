const express = require('express');
const router = express.Router();
const tierController = require('../controllers/tierController');

router.get('/', tierController.getAll);
router.put('/:level', tierController.update);

module.exports = router;