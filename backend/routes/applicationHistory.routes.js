const express = require('express');
const router = express.Router({ mergeParams: true });
const applicationHistoryController = require('../controllers/applicationHistory.controller');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

router.get('/', authenticate, asyncHandler(applicationHistoryController.getHistory));
router.post('/note', authenticate, asyncHandler(applicationHistoryController.addNote));

module.exports = router;
