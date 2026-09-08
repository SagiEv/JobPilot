'use strict';

jest.mock('../../services/contacts.service');
const contactService = require('../../services/contacts.service');
const controller = require('../../controllers/contacts.controller');
const { buildReqRes } = require('../helpers/factories');

describe('contacts.controller', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getAll', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes();
            contactService.getAllContacts.mockResolvedValue([{ id: 1 }]);
            await controller.getAll(req, res);
            expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
        });

        it('should return 400 on error', async () => {
            const { req, res } = buildReqRes();
            contactService.getAllContacts.mockRejectedValue(new Error('fail'));
            await controller.getAll(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('create', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes({ body: { name: 'Jane' } });
            contactService.createContact.mockResolvedValue({ id: 1 });
            await controller.create(req, res);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });
    });

    describe('update', () => {
        it('should return updated data', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 }, body: {} });
            contactService.updateContact.mockResolvedValue({ id: 1 });
            await controller.update(req, res);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });
    });

    describe('remove', () => {
        it('should return result', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 } });
            contactService.deleteContact.mockResolvedValue({ success: true });
            await controller.remove(req, res);
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });
    });

    describe('bulkCreate', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes({ body: { contacts: [] } });
            contactService.bulkCreateContacts.mockResolvedValue({ success: true, count: 0 });
            await controller.bulkCreate(req, res);
            expect(res.json).toHaveBeenCalledWith({ success: true, count: 0 });
        });
    });
});
