'use strict';

const request = require('supertest');
const app = require('../../server');
const { sandbox } = require('./setup.integration');
const { buildUser, buildContact } = require('../helpers/factories');

describe('Integration: Contacts API ↔ Database', () => {
    const user = buildUser();
    const AUTH_HEADER = 'Bearer mock-integration-token';

    beforeEach(() => {
        sandbox.reset();
        sandbox.setAuthUser(user);
    });

    it('should create a new contact', async () => {
        const newContact = buildContact({ id: 1, name: 'Jane Recruiter' });
        sandbox.onTable('contacts').forInsert({ data: newContact, error: null });

        const res = await request(app)
            .post('/api/contacts')
            .set('Authorization', AUTH_HEADER)
            .send({ name: 'Jane Recruiter', email: 'jane@corp.com', company: 'TestCorp', role: 'Recruiter' })
            .expect(200);

        expect(res.body).toHaveProperty('name', 'Jane Recruiter');
    });

    it('should fetch all contacts for the user', async () => {
        const contacts = [
            buildContact({ id: 1 }),
            buildContact({ id: 2, name: 'Bob Manager' }),
        ];
        sandbox.onTable('contacts').forSelect({ data: contacts, error: null });

        const res = await request(app)
            .get('/api/contacts')
            .set('Authorization', AUTH_HEADER)
            .expect(200);

        expect(res.body).toHaveLength(2);
    });

    it('should update an existing contact', async () => {
        const updated = buildContact({ id: 1, name: 'Jane Updated' });
        sandbox.onTable('contacts').forUpdate({ data: updated, error: null });

        const res = await request(app)
            .put('/api/contacts/1')
            .set('Authorization', AUTH_HEADER)
            .send({ name: 'Jane Updated' })
            .expect(200);

        expect(res.body).toHaveProperty('name', 'Jane Updated');
    });

    it('should return 401 without authentication', async () => {
        sandbox.setAuthError();
        await request(app)
            .get('/api/contacts')
            .expect(401);
    });
});
