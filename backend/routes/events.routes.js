const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, eventsController.getAll);
router.post('/', authenticate, eventsController.create);
router.put('/:id', authenticate, eventsController.update);
router.delete('/:id', authenticate, eventsController.remove);

module.exports = router;
