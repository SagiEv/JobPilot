const express = require('express');
const router = express.Router();
const skillController = require('../controllers/skills.controller');

router.get('/', skillController.getAll);
router.post('/', skillController.create);
router.put('/:id', skillController.update);
router.delete('/:id', skillController.remove);

module.exports = router;