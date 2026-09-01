'use strict';

jest.mock('../../services/applicationHistory.service');
const historyService = require('../../services/applicationHistory.service');
const controller = require('../../controllers/applicationHistory.controller');
const { buildReqRes } = require('../helpers/factories');

describe('applicationHistory.controller', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getHistory', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 } });
            historyService.getHistoryByApplicationId.mockResolvedValue([{ id: 1 }]);
            await controller.getHistory(req, res);
            expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
        });

        it('should return 400 on error', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 } });
            historyService.getHistoryByApplicationId.mockRejectedValue(new Error('fail'));
            await controller.getHistory(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('addNote', () => {
        it('should add a Note entry and return data', async () => {
            const { req, res } = buildReqRes({
                params: { id: 5 },
                body: { notes: 'Great call', with_who: 'Recruiter' },
            });
            historyService.addHistory.mockResolvedValue({ id: 10 });
            await controller.addNote(req, res);
            expect(historyService.addHistory).toHaveBeenCalledWith(
                expect.objectContaining({
                    application_id: 5,
                    event_type: 'Note',
                    notes: 'Great call',
                    with_who: 'Recruiter',
                })
            );
            expect(res.json).toHaveBeenCalledWith({ id: 10 });
        });

        it('should return 400 on error', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 }, body: {} });
            historyService.addHistory.mockRejectedValue(new Error('fail'));
            await controller.addNote(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });
});
