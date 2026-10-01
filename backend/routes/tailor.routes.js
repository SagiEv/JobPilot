const express = require('express');
const router = express.Router();
const multer = require('multer');
const tailorController = require('../controllers/tailor.controller');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', authenticate, upload.single('cv_file'), asyncHandler(tailorController.tailorCv));
router.get('/jobs/:id', authenticate, asyncHandler(tailorController.getJobStatus));

module.exports = router;
