const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const multer = require('multer');
const upload = multer({ dest: 'public/images/' });
const { checkAdmin } = require('../controllers/authController');

router.get('/', itemController.getAll);
router.get('/:id', itemController.getById);
router.post('/', checkAdmin, upload.single('image'), itemController.create);
router.put('/:id', checkAdmin, upload.single('image'), itemController.update);
router.delete('/:id', checkAdmin, itemController.delete);

module.exports = router;