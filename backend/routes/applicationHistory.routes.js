const express = require('express');
const router = express.Router({ mergeParams: true });
const applicationHistoryController = require('../controllers/applicationHistory.controller');
const authenticate = require('../middleware/auth');

router.get('/', authenticate, applicationHistoryController.getHistory);
router.post('/note', authenticate, applicationHistoryController.addNote);

module.exports = router;
