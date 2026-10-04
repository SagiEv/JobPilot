const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

router.get('/', authenticate, asyncHandler(notificationsController.getAll));
router.get('/unread-count', authenticate, asyncHandler(notificationsController.getUnreadCount));
router.put('/:id/read', authenticate, asyncHandler(notificationsController.markRead));
router.put('/read-all', authenticate, asyncHandler(notificationsController.markAllRead));

module.exports = router;
