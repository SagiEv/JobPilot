const { parse } = require('csv-parse/sync');
const dayjs = require('dayjs');
const AppError = require('../utils/AppError');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const settingsService = require('./settings.service');

const DATE_FORMATS = [
    'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY', 'D/M/YYYY', 'M/D/YYYY',
    'DD/MM/YY', 'MM/DD/YY', 'YYYY/MM/DD', 'DD.MM.YYYY', 'MM.DD.YYYY'
];

/**
 * Parse CSV text with progressive fallback strategies.
 * Returns { records, parseWarning }.
 */
const parseCsvText = (csvText) => {
    let records = [];
    let parseWarning = null;

    try {
        // Strategy 1: Strict parsing
        records = parse(csvText, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });
    } catch (err1) {
        parseWarning = 'CSV was parsed with lenient mode';
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
                throw new AppError("CSV appears to be empty or unparseable.", 400);
            }
        }
    }

    return { records, parseWarning };
};

/**
 * Resolve the user's timezone from settings, with a default fallback.
 */
const resolveUserTimezone = async (userId, supabaseClient) => {
    try {
        const settings = await settingsService.getSettings(userId, supabaseClient);
        return settings.timezone || 'Asia/Jerusalem';
    } catch (e) {
        console.warn('Could not fetch user timezone for CSV parsing', e);
        return 'Asia/Jerusalem';
    }
};

/**
 * Normalize date fields in parsed CSV records to YYYY-MM-DD format.
 */
const normalizeDates = (records, userTimezone) => {
    return records.map(record => {
        const dateKey = Object.keys(record).find(k => k.toLowerCase() === 'date');
        if (dateKey && record[dateKey]) {
            let parsedDate = dayjs.tz(record[dateKey], DATE_FORMATS, userTimezone);
            if (!parsedDate.isValid()) {
                parsedDate = dayjs.tz(record[dateKey], userTimezone);
            }
            if (parsedDate.isValid()) {
                record[dateKey] = parsedDate.format('YYYY-MM-DD');
            }
        }
        return record;
    });
};

/**
 * Full CSV processing pipeline: parse, resolve timezone, normalize dates.
 */
const processUploadedCsv = async (fileBuffer, userId, supabaseClient) => {
    const csvText = fileBuffer.toString('utf-8');

    // 1. Parse CSV
    const { records: parsedRecords, parseWarning } = parseCsvText(csvText);

    // 2. Resolve timezone and normalize dates
    const userTimezone = await resolveUserTimezone(userId, supabaseClient);
    const records = normalizeDates(parsedRecords, userTimezone);

    return { records, parseWarning };
};

module.exports = { processUploadedCsv, parseCsvText, normalizeDates, resolveUserTimezone };
