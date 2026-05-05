const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skills.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, skillController.getAll);
router.post('/', authenticate, skillController.create);
router.put('/:id', authenticate, skillController.update);
router.delete('/:id', authenticate, skillController.remove);

module.exports = router;