const express = require('express');
const router = express.Router();
const rssController = require('../controllers/rss.controller');
const { authenticate } = require('../middleware/auth');

// Apply auth middleware to protect these routes
router.use(authenticate);

router.get('/feeds', rssController.getFeeds);
router.post('/feeds', rssController.postFeed);
router.put('/feeds/:id', rssController.putFeed);
router.delete('/feeds/:id', rssController.deleteFeed);

router.get('/jobs', rssController.getJobs);

module.exports = router;
