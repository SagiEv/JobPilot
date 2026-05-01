const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interviews.controller');

router.get('/', interviewController.getAll);
router.post('/', interviewController.create);
router.put('/:id', interviewController.update);
router.delete('/:id', interviewController.remove);

module.exports = router;