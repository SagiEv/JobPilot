const { parse } = require('csv-parse/sync');

exports.uploadAndParse = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });

        const csvText = req.file.buffer.toString('utf-8');
        let records = [];
        let parseError = null;

        try {
            // Strategy 1: Strict parsing
            records = parse(csvText, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });
        } catch (err1) {
            parseError = err1;
            try {
                // Strategy 2: Relaxed parsing
                records = parse(csvText, {
                    columns: true,
                    skip_empty_lines: true,
                    trim: true,
                    relax_column_count: true,
                    relax_quotes: true
                });
            } catch (err2) {
                // Strategy 3: Fallback without columns, manually mapping them
                const rawRecords = parse(csvText, {
                    columns: false,
                    skip_empty_lines: true,
                    trim: true,
                    relax_column_count: true,
                    relax_quotes: true
                });
                if (rawRecords.length > 0) {
                    const headers = rawRecords[0];
                    for (let i = 1; i < rawRecords.length; i++) {
                        const row = rawRecords[i];
                        const record = {};
                        headers.forEach((header, index) => {
                            record[header] = row[index] !== undefined ? row[index] : '';
                        });
                        records.push(record);
                    }
                } else {
                    throw new Error("CSV appears to be empty or unparseable.");
                }
            }
        }

        // Date Parsing Logic
        const dayjs = require('dayjs');
        const customParseFormat = require('dayjs/plugin/customParseFormat');
        const timezone = require('dayjs/plugin/timezone');
        const utc = require('dayjs/plugin/utc');
        
        dayjs.extend(customParseFormat);
        dayjs.extend(utc);
        dayjs.extend(timezone);

        const settingsService = require('../services/settings.service');
        let userTimezone = 'Asia/Jerusalem';
        if (req.user && req.user.id) {
            try {
                const settings = await settingsService.getSettings(req.user.id, req.token);
                if (settings.timezone) {
                    userTimezone = settings.timezone;
                }
            } catch (e) {
                console.warn('Could not fetch user timezone for CSV parsing', e);
            }
        }

        const dateFormats = [
            'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY', 'D/M/YYYY', 'M/D/YYYY',
            'DD/MM/YY', 'MM/DD/YY', 'YYYY/MM/DD', 'DD.MM.YYYY', 'MM.DD.YYYY'
        ];

        records = records.map(record => {
            // Find the date key, it might be 'date', 'Date', or 'DATE'
            let dateKey = Object.keys(record).find(k => k.toLowerCase() === 'date');
            if (dateKey && record[dateKey]) {
                let parsedDate = dayjs.tz(record[dateKey], dateFormats, userTimezone);
                if (!parsedDate.isValid()) {
                    parsedDate = dayjs.tz(record[dateKey], userTimezone);
                }
                if (parsedDate.isValid()) {
                    record[dateKey] = parsedDate.format('YYYY-MM-DD');
                }
            }
            return record;
        });

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