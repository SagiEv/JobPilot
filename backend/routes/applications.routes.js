const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applications.controller');

router.get('/', applicationController.getAll);
router.post('/', applicationController.create);
router.put('/:id', applicationController.update);
router.delete('/:id', applicationController.remove);
router.post('/bulk', applicationController.bulkCreate);

module.exports = router;