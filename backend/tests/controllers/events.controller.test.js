'use strict';

jest.mock('../../services/events.service');
const eventsService = require('../../services/events.service');
const controller = require('../../controllers/events.controller');
const { buildReqRes } = require('../helpers/factories');

describe('events.controller', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getAll', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes();
            eventsService.getAllEvents.mockResolvedValue([{ id: 1 }]);
            await controller.getAll(req, res);
            expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
        });

        it('should throw on error', async () => {
            const { req, res } = buildReqRes();
            eventsService.getAllEvents.mockRejectedValue(new Error('fail'));
            await expect(controller.getAll(req, res)).rejects.toThrow();
        });
    });

    describe('create', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes({ body: { title: 'Call' } });
            eventsService.createEvent.mockResolvedValue({ id: 1 });
            await controller.create(req, res);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });
    });

    describe('update', () => {
        it('should return updated data', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 }, body: {} });
            eventsService.updateEvent.mockResolvedValue({ id: 1 });
            await controller.update(req, res);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });
    });

    describe('remove', () => {
        it('should return result', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 } });
            eventsService.deleteEvent.mockResolvedValue({ success: true });
            await controller.remove(req, res);
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });
    });
});
