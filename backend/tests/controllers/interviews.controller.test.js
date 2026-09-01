'use strict';

jest.mock('../../services/interviews.service');
const interviewService = require('../../services/interviews.service');
const controller = require('../../controllers/interviews.controller');
const { buildReqRes } = require('../helpers/factories');

describe('interviews.controller', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getAll', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes();
            interviewService.getAllInterviews.mockResolvedValue([{ id: 1 }]);
            await controller.getAll(req, res);
            expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
        });
    });

    describe('create', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes({ body: { company: 'X' } });
            interviewService.createInterview.mockResolvedValue({ id: 1 });
            await controller.create(req, res);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });
    });

    describe('update', () => {
        it('should return updated data', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 }, body: {} });
            interviewService.updateInterview.mockResolvedValue({ id: 1 });
            await controller.update(req, res);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });
    });

    describe('remove', () => {
        it('should return result', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 } });
            interviewService.deleteInterview.mockResolvedValue({ success: true });
            await controller.remove(req, res);
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });
    });

    describe('getAiReports', () => {
        it('should return reports', async () => {
            const { req, res } = buildReqRes();
            interviewService.getAiReports.mockResolvedValue([{ id: 1 }]);
            await controller.getAiReports(req, res);
            expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
        });
    });

    describe('generateAiReport', () => {
        it('should return report', async () => {
            const { req, res } = buildReqRes();
            interviewService.generateAiReport.mockResolvedValue({ id: 1 });
            await controller.generateAiReport(req, res);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });

        it('should return 400 on error', async () => {
            const { req, res } = buildReqRes();
            interviewService.generateAiReport.mockRejectedValue(new Error('No data'));
            await controller.generateAiReport(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });
});
