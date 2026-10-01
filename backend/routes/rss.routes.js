const express = require('express');
const router = express.Router();
const rssController = require('../controllers/rss.controller');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

// Apply auth middleware to protect these routes
router.use(authenticate);

router.get('/feeds', asyncHandler(rssController.getFeeds));
router.post('/feeds', asyncHandler(rssController.postFeed));
router.put('/feeds/:id', asyncHandler(rssController.putFeed));
router.delete('/feeds/:id', asyncHandler(rssController.deleteFeed));

router.get('/jobs', asyncHandler(rssController.getJobs));

module.exports = router;
