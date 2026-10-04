const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interviews.controller');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

const { validate } = require('../middleware/validate');
const { createInterviewSchema, updateInterviewSchema } = require('../schemas/interviewSchemas');

router.get('/', authenticate, asyncHandler(interviewController.getAll));
router.post('/', authenticate, validate(createInterviewSchema), asyncHandler(interviewController.create));
router.post('/analyze', authenticate, asyncHandler(interviewController.generateAiReport));
router.get('/reports', authenticate, asyncHandler(interviewController.getAiReports));
router.put('/:id', authenticate, validate(updateInterviewSchema), asyncHandler(interviewController.update));
router.delete('/:id', authenticate, asyncHandler(interviewController.remove));

module.exports = router;