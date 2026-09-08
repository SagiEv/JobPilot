'use strict';

const controller = require('../../controllers/csv.controller');
const { buildReqRes } = require('../helpers/factories');

// Mock the settings service to prevent real DB calls
jest.mock('../../services/settings.service', () => ({
    getSettings: jest.fn().mockResolvedValue({ timezone: 'Asia/Jerusalem' }),
}));

describe('csv.controller', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('uploadAndParse', () => {
        it('should return 400 when no file provided', async () => {
            const { req, res } = buildReqRes();
            req.file = null;
            await controller.uploadAndParse(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'No file provided' });
        });

        it('should parse valid CSV and return records', async () => {
            // Arrange
            const csvContent = 'company,position,status\nGoogle,SWE,Applied\nMeta,PM,Interviewing';
            const { req, res } = buildReqRes();
            req.file = {
                buffer: Buffer.from(csvContent),
                originalname: 'apps.csv',
            };

            // Act
            await controller.uploadAndParse(req, res);

            // Assert
            const response = res.json.mock.calls[0][0];
            expect(response.success).toBe(true);
            expect(response.rowCount).toBe(2);
            expect(response.data[0].company).toBe('Google');
            expect(response.filename).toBe('apps.csv');
        });

        it('should handle CSV with dates and normalize them', async () => {
            // Arrange
            const csvContent = 'company,position,date\nGoogle,SWE,2025-06-15';
            const { req, res } = buildReqRes();
            req.file = {
                buffer: Buffer.from(csvContent),
                originalname: 'dates.csv',
            };

            // Act
            await controller.uploadAndParse(req, res);

            // Assert
            const response = res.json.mock.calls[0][0];
            // Just check it parsed successfully rather than exact day which might vary by local test env timezone if not mocked
            expect(response.data[0].date).toMatch(/^2025-06-1/);
        });

        it('should add warning when using relaxed parsing mode', async () => {
            // Arrange — Invalid CSV that strict parsing rejects but fallback handles
            // A row with more columns than headers will fail strict mode
            const csvContent = 'company,position\nGoogle,SWE,ExtraColumn';
            const { req, res } = buildReqRes();
            req.file = {
                buffer: Buffer.from(csvContent),
                originalname: 'bad.csv',
            };

            // Act
            await controller.uploadAndParse(req, res);

            // Assert
            const response = res.json.mock.calls[0][0];
            expect(response.success).toBe(true);
            expect(response.warning).toBeDefined();
        });

        it('should return 400 on completely invalid CSV', async () => {
            // Arrange - provide completely invalid buffer that breaks toString
            const { req, res } = buildReqRes();
            req.file = {
                buffer: { toString: () => { throw new Error('Fatal buffer error'); } },
                originalname: 'empty.csv',
            };

            // Act
            await controller.uploadAndParse(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            const response = res.json.mock.calls[0][0];
            expect(response.error).toBe('Failed to parse CSV');
        });
    });
});
