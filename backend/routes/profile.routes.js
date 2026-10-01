const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

router.get('/', authenticate, asyncHandler(profileController.getProfile));
router.put('/', authenticate, asyncHandler(profileController.updateProfile));

module.exports = router;