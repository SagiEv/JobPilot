const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/searchSettings.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getSettings);
router.put('/', authenticate, ctrl.putSettings);
router.get('/sites', authenticate, ctrl.getSites);
router.post('/sites', authenticate, ctrl.postSite);
router.put('/sites/:id', authenticate, ctrl.putSite);
router.delete('/sites/:id', authenticate, ctrl.deleteSite);

module.exports = router;