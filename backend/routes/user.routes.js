const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/asyncHandler');
const { signupSchema } = require('../schemas/userSchemas');

// Public Routes
router.post('/signup', validate(signupSchema), asyncHandler(userController.signup));
router.post('/login', asyncHandler(userController.login));
router.post('/refresh', asyncHandler(userController.refreshToken));

// Protected Routes
router.get('/profile', authenticate, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;