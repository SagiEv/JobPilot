const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contacts.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, contactController.getAll);
router.post('/', authenticate, contactController.create);
router.put('/:id', authenticate, contactController.update);
router.delete('/:id', authenticate, contactController.remove);
router.post('/bulk', authenticate, contactController.bulkCreate);

module.exports = router;