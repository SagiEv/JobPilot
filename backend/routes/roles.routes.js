const express = require('express');
const router = express.Router();
const rolesController = require('../controllers/roles.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, rolesController.getRolesBank);

module.exports = router;
