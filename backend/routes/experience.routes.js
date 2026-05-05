const express = require('express');
const router = express.Router();
const experienceController = require('../controllers/experience.controller');
const { authenticate } = require('../middleware/auth');

// Project Routes
router.get('/projects', authenticate, experienceController.getProjects);
router.post('/projects', authenticate, experienceController.postProject);
router.put('/projects/:id', authenticate, experienceController.putProject);
router.delete('/projects/:id', authenticate, experienceController.deleteProject);

// Text Routes
router.get('/text', authenticate, experienceController.getExpText);
router.put('/text', authenticate, experienceController.putExpText);

module.exports = router;