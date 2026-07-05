const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interviews.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, interviewController.getAll);
router.post('/', authenticate, interviewController.create);
router.post('/analyze', authenticate, interviewController.generateAiReport);
router.get('/reports', authenticate, interviewController.getAiReports);
router.put('/:id', authenticate, interviewController.update);
router.delete('/:id', authenticate, interviewController.remove);

module.exports = router;