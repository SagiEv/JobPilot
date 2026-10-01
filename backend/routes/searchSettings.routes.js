const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/searchSettings.controller');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

router.get('/', authenticate, asyncHandler(ctrl.getSettings));
router.put('/', authenticate, asyncHandler(ctrl.putSettings));
router.get('/sites', authenticate, asyncHandler(ctrl.getSites));
router.post('/sites', authenticate, asyncHandler(ctrl.postSite));
router.put('/sites/:id', authenticate, asyncHandler(ctrl.putSite));
router.delete('/sites/:id', authenticate, asyncHandler(ctrl.deleteSite));
router.post('/run-search', authenticate, asyncHandler(ctrl.runSearch));

// Scraped Jobs
router.get('/scraped-jobs', authenticate, asyncHandler(ctrl.getScrapedJobs));
router.patch('/scraped-jobs/:id', authenticate, asyncHandler(ctrl.updateScrapedJob));
router.delete('/scraped-jobs/:id', authenticate, asyncHandler(ctrl.deleteScrapedJob));

module.exports = router;