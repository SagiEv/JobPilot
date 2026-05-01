const { parse } = require('csv-parse/sync');

exports.uploadAndParse = (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });

        const csvText = req.file.buffer.toString('utf-8');
        let records = [];
        let parseError = null;

        // ... [Insert all the Strategy 1, 2, 3 parsing and normalization logic here from your original post] ...
        // (Keep the logic exactly as you wrote it, just wrapped in this function)

        res.json({
            success: true,
            filename: req.file.originalname,
            rowCount: records.length,
            data: records,
            warning: parseError ? 'CSV was parsed with lenient mode' : undefined
        });
    } catch (error) {
        res.status(400).json({ error: 'Failed to parse CSV', message: error.message });
    }
};