const express = require('express');
const router = express.Router();
const emailController = require('../controllers/email.controller');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

router.get('/status', authenticate, asyncHandler(emailController.getStatus));
router.post('/sync', authenticate, asyncHandler(emailController.syncEmail));
router.delete('/disconnect', authenticate, asyncHandler(emailController.disconnectEmail));
// OAuth flows — googleAuth is sync (redirect), callback is async
router.get('/auth/google', asyncHandler(emailController.googleAuth));
router.get('/auth/google/callback', asyncHandler(emailController.googleCallback));

module.exports = router;
