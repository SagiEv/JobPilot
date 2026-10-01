const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skills.controller');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

const { validate } = require('../middleware/validate');
const { createSkillSchema, updateSkillSchema } = require('../schemas/skillSchemas');

router.get('/', authenticate, asyncHandler(skillController.getAll));
router.post('/', authenticate, validate(createSkillSchema), asyncHandler(skillController.create));
router.put('/:id', authenticate, validate(updateSkillSchema), asyncHandler(skillController.update));
router.delete('/:id', authenticate, asyncHandler(skillController.remove));

module.exports = router;