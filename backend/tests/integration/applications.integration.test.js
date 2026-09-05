'use strict';

const request = require('supertest');
const app = require('../../server');
const { sandbox } = require('./setup.integration');
const { buildApplication, buildUser } = require('../helpers/factories');

describe('Integration: Applications API ↔ Database', () => {
    const user = buildUser();
    const AUTH_HEADER = 'Bearer mock-integration-token';

    beforeEach(() => {
        sandbox.reset();
        sandbox.setAuthUser(user);
    });

    // ── GET /api/applications ─────────────────────────────────────────────

    describe('GET /api/applications', () => {
        it('should return applications enriched with last_activity_date', async () => {
            const apps = [
                buildApplication({ id: 1 }),
                buildApplication({ id: 2, company: 'AnotherCorp' }),
            ];

            // First call: applicationRepository.findAll → applications table select
            sandbox.onTable('applications').forSelect({ data: apps, error: null });

            // Second call: application_history select for enrichment
            sandbox.onTable('application_history').forSelect({
                data: [
                    { application_id: 1, event_date: '2025-03-01', created_at: '2025-03-01T00:00:00Z', event_type: 'Status Change' },
                    { application_id: 2, event_date: '2025-04-01', created_at: '2025-04-01T00:00:00Z', event_type: 'Application Added' },
                ],
                error: null,
            });

            const res = await request(app)
                .get('/api/applications')
                .set('Authorization', AUTH_HEADER)
                .expect(200);

            expect(res.body).toHaveLength(2);
            expect(res.body[0].last_activity_date).toBeDefined();
            expect(res.body[1].last_activity_date).toBeDefined();
        });

        it('should return 401 without auth token', async () => {
            sandbox.setAuthError();
            await request(app)
                .get('/api/applications')
                .expect(401);
        });
    });

    // ── POST /api/applications ────────────────────────────────────────────

    describe('POST /api/applications', () => {
        it('should create application and log history entry', async () => {
            const newApp = buildApplication({ id: 10, company: 'NewCorp', status: 'Applied' });

            // applicationRepository.create → insert then select.single
            sandbox.onTable('applications').forInsert({ data: newApp, error: null });

            // applicationHistoryService.logChange → insert into application_history
            sandbox.onTable('application_history').forInsert({ data: { id: 1 }, error: null });

            const res = await request(app)
                .post('/api/applications')
                .set('Authorization', AUTH_HEADER)
                .send({ company: 'NewCorp', position: 'Engineer', status: 'Applied' })
                .expect(200);

            expect(res.body).toHaveProperty('id', 10);
            expect(res.body.company).toBe('NewCorp');

            // Verify history was written
            const historyCalls = sandbox.getCallsTo('application_history', 'insert');
            expect(historyCalls.length).toBeGreaterThanOrEqual(1);
        });
    });

    // ── PUT /api/applications/:id ─────────────────────────────────────────

    describe('PUT /api/applications/:id', () => {
        it('should update application and trigger status recalculation', async () => {
            const existingApp = buildApplication({ id: 5, status: 'Applied', stage: null });

            // findById
            sandbox.onTable('applications').forSelect({ data: existingApp, error: null });

            // getHistoryByApplicationId (called twice — before and after logging)
            sandbox.onTable('application_history')
                .forSelect({ data: [], error: null })  // First call: check conflicts
                .forSelect({                            // Second call: recalculate
                    data: [
                        { id: 1, event_date: new Date().toISOString(), new_status: 'Interviewing', new_stage: 'HR Screen' },
                    ],
                    error: null,
                });

            // logChange → insert
            sandbox.onTable('application_history').forInsert({ data: { id: 1 }, error: null });

            // applicationRepository.update
            sandbox.onTable('applications').forUpdate({
                data: { id: 5, status: 'Interviewing', stage: 'HR Screen' },
                error: null,
            });

            const res = await request(app)
                .put('/api/applications/5')
                .set('Authorization', AUTH_HEADER)
                .send({ status: 'Interviewing', stage: 'HR Screen' })
                .expect(200);

            expect(res.body.status).toBe('Interviewing');
        });

        it('should return 409 on conflicting event_date without resolution', async () => {
            const existingApp = buildApplication({ id: 5, status: 'Applied', stage: null });
            const targetDate = '2025-06-15';

            sandbox.onTable('applications').forSelect({ data: existingApp, error: null });

            // History has an existing event on the same date
            sandbox.onTable('application_history').forSelect({
                data: [
                    {
                        id: 10, event_date: `${targetDate}T00:00:00Z`,
                        event_type: 'Status Change',
                        new_status: 'Assessment', new_stage: 'Online Test',
                    },
                ],
                error: null,
            });

            const res = await request(app)
                .put('/api/applications/5')
                .set('Authorization', AUTH_HEADER)
                .send({
                    status: 'Interviewing',
                    stage: 'HR Screen',
                    event_date: `${targetDate}T12:00:00Z`,
                    // No conflict_resolution → should throw
                })
                .expect(409);

            expect(res.body.error).toContain('Conflicting');
        });
    });

    // ── DELETE /api/applications/:id ──────────────────────────────────────

    describe('DELETE /api/applications/:id', () => {
        it('should delete application and return success', async () => {
            sandbox.onTable('applications').forDelete({ data: null, error: null });

            const res = await request(app)
                .delete('/api/applications/5')
                .set('Authorization', AUTH_HEADER)
                .expect(200);

            expect(res.body).toHaveProperty('success', true);

            const deleteCalls = sandbox.getCallsTo('applications', 'delete');
            expect(deleteCalls.length).toBe(1);
        });
    });

    // ── POST /api/applications/bulk ───────────────────────────────────────

    describe('POST /api/applications/bulk', () => {
        it('should bulk create multiple applications', async () => {
            const bulkApps = [
                buildApplication({ id: 20, company: 'BulkCorp1' }),
                buildApplication({ id: 21, company: 'BulkCorp2' }),
            ];

            sandbox.onTable('applications').forInsert({ data: bulkApps, error: null });

            const res = await request(app)
                .post('/api/applications/bulk')
                .set('Authorization', AUTH_HEADER)
                .send({
                    applications: [
                        { company: 'BulkCorp1', position: 'Dev', status: 'Applied' },
                        { company: 'BulkCorp2', position: 'QA', status: 'Applied' },
                    ],
                })
                .expect(200);

            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('count', 2);
        });
    });
});
