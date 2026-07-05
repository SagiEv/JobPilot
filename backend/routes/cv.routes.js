const express = require('express');
const router = express.Router();
const cvController = require('../controllers/cv.controller');
const { authenticate } = require('../middleware/auth');

router.post('/generate', authenticate, cvController.generateCv);
router.post('/preview-jsonresume', authenticate, cvController.previewCvJsonResume);
router.post('/generate-jsonresume', authenticate, cvController.generateCvJsonResume);

module.exports = router;