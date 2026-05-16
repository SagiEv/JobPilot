const express = require('express');
const router = express.Router();
const emailController = require('../controllers/email.controller');
const { authenticate } = require('../middleware/auth');

router.get('/status', authenticate, emailController.getStatus);
router.post('/sync', authenticate, emailController.syncEmail);
router.delete('/disconnect', authenticate, emailController.disconnectEmail);
// OAuth flows might need a different way to handle auth depending on how the frontend passes the token.
// For simplicity, we'll assume the frontend passes auth token in query or we use a temporary session.
// In a real app, /auth/google might not require authenticate if it's the start of flow, but we need to know WHICH user is connecting.
// Let's pass userId as a state parameter.
router.get('/auth/google', emailController.googleAuth);
router.get('/auth/google/callback', emailController.googleCallback);

module.exports = router;
