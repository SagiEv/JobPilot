const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contacts.controller');

router.get('/', contactController.getAll);
router.post('/', contactController.create);
router.put('/:id', contactController.update);
router.delete('/:id', contactController.remove);
router.post('/bulk', contactController.bulkCreate);

module.exports = router;