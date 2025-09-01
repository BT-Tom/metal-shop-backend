const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/', userController.getAll);
router.put('/:id/tier', userController.updateTier);

module.exports = router;