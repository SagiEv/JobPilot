const express = require('express');
const router = express.Router();
const cvController = require('../controllers/cv.controller');
const { authenticate } = require('../middleware/auth');

router.post('/generate', authenticate, cvController.generateCv);

module.exports = router;