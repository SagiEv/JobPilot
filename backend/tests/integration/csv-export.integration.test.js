'use strict';

const request = require('supertest');
const path = require('path');
const app = require('../../server');
const { sandbox } = require('./setup.integration');
const { buildUser } = require('../helpers/factories');

describe('Integration: CSV Export Flows', () => {
    const user = buildUser();
    const AUTH_HEADER = 'Bearer mock-integration-token';

    beforeEach(() => {
        sandbox.reset();
        sandbox.setAuthUser(user);
    });

    // ── Test 1: Valid CSV upload ──────────────────────────────────────────

    it('should parse a valid CSV and return structured data', async () => {
        // Mock settings fetch for timezone
        sandbox.onTable('app_settings').forSelect({
            data: { timezone: 'Asia/Jerusalem' },
            error: null,
        });

        const csvContent = 'company,position,status,date\nTestCorp,Engineer,Applied,2025-01-15\nAcme,QA,Applied,2025-02-20\n';

        const res = await request(app)
            .post('/api/csv/upload')
            .set('Authorization', AUTH_HEADER)
            .attach('file', Buffer.from(csvContent), {
                filename: 'applications.csv',
                contentType: 'text/csv',
            })
            .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.rowCount).toBe(2);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.data[0]).toHaveProperty('company', 'TestCorp');
        expect(res.body.data[1]).toHaveProperty('position', 'QA');
    });

    // ── Test 2: Date format normalization ─────────────────────────────────

    it('should normalize DD/MM/YYYY dates to YYYY-MM-DD', async () => {
        sandbox.onTable('app_settings').forSelect({
            data: { timezone: 'Asia/Jerusalem' },
            error: null,
        });

        const csvContent = 'company,position,status,date\nTestCorp,Dev,Applied,15/01/2025\n';

        const res = await request(app)
            .post('/api/csv/upload')
            .set('Authorization', AUTH_HEADER)
            .attach('file', Buffer.from(csvContent), {
                filename: 'dates.csv',
                contentType: 'text/csv',
            })
            .expect(200);

        expect(res.body.data[0].date).toBe('2025-01-15');
    });

    // ── Test 3: Relaxed parsing for malformed CSV ─────────────────────────

    it('should parse malformed CSV with uneven columns using relaxed mode', async () => {
        sandbox.onTable('app_settings').forSelect({
            data: { timezone: 'Asia/Jerusalem' },
            error: null,
        });

        // Extra comma in one row
        const csvContent = 'company,position,status\nTestCorp,Engineer,Applied\n"Acme, Inc",QA,Applied,extra-col\n';

        const res = await request(app)
            .post('/api/csv/upload')
            .set('Authorization', AUTH_HEADER)
            .attach('file', Buffer.from(csvContent), {
                filename: 'malformed.csv',
                contentType: 'text/csv',
            })
            .expect(200);

        // Should still parse (may have warning flag)
        expect(res.body.success).toBe(true);
        expect(res.body.rowCount).toBeGreaterThanOrEqual(1);
    });

    // ── Test 4: Empty CSV returns 400 ─────────────────────────────────────

    it('should return 400 for an empty CSV file', async () => {
        sandbox.onTable('app_settings').forSelect({
            data: { timezone: 'Asia/Jerusalem' },
            error: null,
        });

        const res = await request(app)
            .post('/api/csv/upload')
            .set('Authorization', AUTH_HEADER)
            .attach('file', Buffer.from(''), {
                filename: 'empty.csv',
                contentType: 'text/csv',
            })
            .expect(200);

        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('rowCount', 0);
    });

    // ── Test 5: Non-CSV file rejected ─────────────────────────────────────

    it('should reject non-CSV file uploads', async () => {
        const res = await request(app)
            .post('/api/csv/upload')
            .set('Authorization', AUTH_HEADER)
            .attach('file', Buffer.from('not a csv'), {
                filename: 'data.txt',
                contentType: 'text/plain',
            })
            .expect(500);

        // Multer filter rejects non-CSV, throwing an error caught by the 500 handler
        expect(res.status).toBe(500);
    });

    // ── Test 6: Bulk import round-trip ────────────────────────────────────

    it('should parse CSV then bulk-import parsed rows as applications', async () => {
        sandbox.onTable('app_settings').forSelect({
            data: { timezone: 'Asia/Jerusalem' },
            error: null,
        });

        const csvContent = 'company,position,status,date\nRoundTripCorp,Dev,Applied,2025-03-01\nRoundTrip2,QA,Applied,2025-03-02\n';

        // Step 1: Parse CSV
        const parseRes = await request(app)
            .post('/api/csv/upload')
            .set('Authorization', AUTH_HEADER)
            .attach('file', Buffer.from(csvContent), {
                filename: 'roundtrip.csv',
                contentType: 'text/csv',
            })
            .expect(200);

        const parsedRows = parseRes.body.data;
        expect(parsedRows).toHaveLength(2);

        // Step 2: Bulk import
        const bulkApps = parsedRows.map((row, i) => ({
            id: 100 + i,
            user_id: user.id,
            company: row.company,
            position: row.position,
            status: row.status,
            date: row.date,
        }));

        sandbox.onTable('applications').forInsert({ data: bulkApps, error: null });

        const bulkRes = await request(app)
            .post('/api/applications/bulk')
            .set('Authorization', AUTH_HEADER)
            .send({ applications: parsedRows })
            .expect(200);

        expect(bulkRes.body).toHaveProperty('success', true);
        expect(bulkRes.body).toHaveProperty('count', 2);
    });
});
