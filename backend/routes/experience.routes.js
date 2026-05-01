const express = require('express');
const router = express.Router();
const experienceController = require('../controllers/experience.controller');

// Project Routes
router.get('/projects', experienceController.getProjects);
router.post('/projects', experienceController.postProject);
router.put('/projects/:id', experienceController.putProject);
router.delete('/projects/:id', experienceController.deleteProject);

// Text Routes
router.get('/text', experienceController.getExpText);
router.put('/text', experienceController.putExpText);

module.exports = router;