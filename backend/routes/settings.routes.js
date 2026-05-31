const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, settingsController.getSettings);
router.put('/', authenticate, settingsController.putSettings);
router.post('/test-smtp', authenticate, settingsController.testSmtpConnection);
router.get('/email-logs', authenticate, settingsController.getEmailLogs);

module.exports = router;
