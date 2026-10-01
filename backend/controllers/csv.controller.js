const csvService = require('../services/csv.service');
const AppError = require('../utils/AppError');

exports.uploadAndParse = async (req, res) => {
    if (!req.file) {
        throw new AppError('No file provided', 400);
    }

    const { records, parseWarning } = await csvService.processUploadedCsv(
        req.file.buffer,
        req.user?.id,
        req.supabase
    );

    res.json({
        success: true,
        filename: req.file.originalname,
        rowCount: records.length,
        data: records,
        warning: parseWarning || undefined
    });
};