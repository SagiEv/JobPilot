const express = require('express');
const router = express.Router();
const multer = require('multer');
const tailorController = require('../controllers/tailor.controller');
const { authenticate } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', authenticate, upload.single('cv_file'), tailorController.tailorCv);

module.exports = router;
