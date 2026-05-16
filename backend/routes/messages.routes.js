const express = require('express');
const router = express.Router();
const multer = require('multer');
const messagesController = require('../controllers/messages.controller');
const { authenticate } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/generate', authenticate, upload.single('cvFile'), messagesController.generateMessage);

module.exports = router;
