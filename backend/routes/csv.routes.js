const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvController = require('../controllers/csv.controller');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    }
});

router.post('/upload', upload.single('file'), csvController.uploadAndParse);

module.exports = router;