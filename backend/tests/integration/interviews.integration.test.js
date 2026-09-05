'use strict';

const request = require('supertest');
const app = require('../../server');
const { sandbox } = require('./setup.integration');
const { buildUser, buildInterview } = require('../helpers/factories');

describe('Integration: Interviews API ↔ Database', () => {
    const user = buildUser();
    const AUTH_HEADER = 'Bearer mock-integration-token';

    beforeEach(() => {
        sandbox.reset();
        sandbox.setAuthUser(user);
    });

    it('should create an interview tied to an application', async () => {
        const newInterview = buildInterview({ id: 1, application_id: 5 });
        sandbox.onTable('interviews').forInsert({ data: newInterview, error: null });

        const res = await request(app)
            .post('/api/interviews')
            .set('Authorization', AUTH_HEADER)
            .send({
                application_id: 5,
                company: 'TestCorp',
                stage: 'Technical Interview',
                date: '2025-02-01',
            })
            .expect(200);

        expect(res.body).toHaveProperty('application_id', 5);
        expect(res.body).toHaveProperty('stage', 'Technical Interview');
    });

    it('should fetch all interviews for the user', async () => {
        const interviews = [
            buildInterview({ id: 1 }),
            buildInterview({ id: 2, stage: 'HR Screen' }),
        ];
        sandbox.onTable('interviews').forSelect({ data: interviews, error: null });

        const res = await request(app)
            .get('/api/interviews')
            .set('Authorization', AUTH_HEADER)
            .expect(200);

        expect(res.body).toHaveLength(2);
    });

    it('should update interview keep/improve fields', async () => {
        const updated = buildInterview({
            id: 1,
            keep: 'Clear communication',
            improve: 'Deeper system design',
        });
        sandbox.onTable('interviews').forUpdate({ data: updated, error: null });

        const res = await request(app)
            .put('/api/interviews/1')
            .set('Authorization', AUTH_HEADER)
            .send({ keep: 'Clear communication', improve: 'Deeper system design' })
            .expect(200);

        expect(res.body.keep).toBe('Clear communication');
        expect(res.body.improve).toBe('Deeper system design');
    });
});
