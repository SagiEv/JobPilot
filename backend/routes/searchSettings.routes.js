const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/searchSettings.controller');

router.get('/', ctrl.getSettings);
router.put('/', ctrl.putSettings);
router.get('/sites', ctrl.getSites);
router.post('/sites', ctrl.postSite);
router.put('/sites/:id', ctrl.putSite);
router.delete('/sites/:id', ctrl.deleteSite);

module.exports = router;