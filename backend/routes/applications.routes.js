const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applications.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, applicationController.getAll);
router.post('/', authenticate, applicationController.create);
router.put('/:id', authenticate, applicationController.update);
router.delete('/:id', authenticate, applicationController.remove);
router.post('/bulk', authenticate, applicationController.bulkCreate);

module.exports = router;