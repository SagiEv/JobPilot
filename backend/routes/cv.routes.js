const express = require('express');
const router = express.Router();
const cvController = require('../controllers/cv.controller');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

router.post('/generate', authenticate, asyncHandler(cvController.generateCv));
router.post('/preview-jsonresume', authenticate, asyncHandler(cvController.previewCvJsonResume));
router.post('/generate-jsonresume', authenticate, asyncHandler(cvController.generateCvJsonResume));

module.exports = router;