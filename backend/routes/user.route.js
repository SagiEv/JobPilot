
const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
// const { authorize } = require('../middleware/roleCheck');
const { signupSchema } = require('../schemas/userSchemas');

// Public Routes
router.post('/signup', validate(signupSchema), userController.signup);
router.post('/login', userController.login);
router.post('/refresh', userController.refreshToken);

// Protected Routes
router.get('/profile', authenticate, (req, res) => {
    res.json({ user: req.user });
});

// A route only an Admin can see
// router.get(
//     '/admin-dashboard',
//     authenticate,               // Step 1: Who are you?
//     authorize(['admin']),       // Step 2: Are you an admin?
//     userController.getDashboard // Step 3: Okay, the protected data.
// );

module.exports = router;