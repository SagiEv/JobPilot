const express = require('express');
const router = express.Router();
const cvController = require('../controllers/cv.controller');

router.post('/generate', cvController.generateCv);

module.exports = router;