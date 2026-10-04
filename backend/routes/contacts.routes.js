const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contacts.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/asyncHandler');
const { createContactSchema, updateContactSchema } = require('../schemas/contactSchemas');

router.get('/', authenticate, asyncHandler(contactController.getAll));
router.post('/', authenticate, validate(createContactSchema), asyncHandler(contactController.create));
router.put('/:id', authenticate, validate(updateContactSchema), asyncHandler(contactController.update));
router.delete('/:id', authenticate, asyncHandler(contactController.remove));
router.post('/bulk', authenticate, asyncHandler(contactController.bulkCreate));

module.exports = router;