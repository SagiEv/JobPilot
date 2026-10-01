const express = require('express');
const router = express.Router();
const rolesController = require('../controllers/roles.controller');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

router.get('/', authenticate, asyncHandler(rolesController.getRolesBank));

module.exports = router;
