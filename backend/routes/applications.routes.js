const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applications.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, applicationController.getAll);
router.get('/analytics/time-to-reject', authenticate, applicationController.getTimeToReject);
router.post('/', authenticate, applicationController.create);
router.put('/:id', authenticate, applicationController.update);
router.delete('/:id', authenticate, applicationController.remove);
router.post('/bulk', authenticate, applicationController.bulkCreate);

router.use('/:id/history', require('./applicationHistory.routes'));

module.exports = router;