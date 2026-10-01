const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applications.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/asyncHandler');
const { createApplicationSchema, updateApplicationSchema } = require('../schemas/applicationSchemas');

router.get('/', authenticate, asyncHandler(applicationController.getAll));
router.get('/stats/daily', authenticate, asyncHandler(applicationController.getDailyStats));
router.get('/analytics/metrics', authenticate, asyncHandler(applicationController.getAnalyticsMetrics));
router.post('/', authenticate, asyncHandler(applicationController.create));
router.put('/:id', authenticate, asyncHandler(applicationController.update));
router.delete('/:id', authenticate, asyncHandler(applicationController.remove));
router.post('/bulk', authenticate, asyncHandler(applicationController.bulkCreate));

router.use('/:id/history', require('./applicationHistory.routes'));

module.exports = router;