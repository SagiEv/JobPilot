const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/asyncHandler');
const { updateSettingsSchema } = require('../schemas/settingsSchemas');

router.get('/', authenticate, asyncHandler(settingsController.getSettings));
router.put('/', authenticate, validate(updateSettingsSchema), asyncHandler(settingsController.putSettings));
router.post('/test-smtp', authenticate, asyncHandler(settingsController.testSmtpConnection));
router.post('/test-ai-token', authenticate, asyncHandler(settingsController.testAiToken));
router.get('/email-logs', authenticate, asyncHandler(settingsController.getEmailLogs));

module.exports = router;
