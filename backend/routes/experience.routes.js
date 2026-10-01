const express = require('express');
const router = express.Router();
const experienceController = require('../controllers/experience.controller');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

const { validate } = require('../middleware/validate');
const { createExperienceSchema, updateExperienceSchema } = require('../schemas/experienceSchemas');

// Project Routes
router.get('/projects', authenticate, asyncHandler(experienceController.getProjects));
router.post('/projects', authenticate, validate(createExperienceSchema), asyncHandler(experienceController.postProject));
router.put('/projects/:id', authenticate, validate(updateExperienceSchema), asyncHandler(experienceController.putProject));
router.delete('/projects/:id', authenticate, asyncHandler(experienceController.deleteProject));

module.exports = router;