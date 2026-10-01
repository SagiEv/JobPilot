const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events.controller');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

router.get('/', authenticate, asyncHandler(eventsController.getAll));
router.post('/', authenticate, asyncHandler(eventsController.create));
router.put('/:id', authenticate, asyncHandler(eventsController.update));
router.delete('/:id', authenticate, asyncHandler(eventsController.remove));

module.exports = router;
