'use strict';

jest.mock('../../services/applications.service');
const applicationService = require('../../services/applications.service');
const controller = require('../../controllers/applications.controller');
const { buildReqRes, buildApplication } = require('../helpers/factories');

describe('applications.controller', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getAll', () => {
        it('should return 401 when req.user is missing', async () => {
            const { req, res } = buildReqRes();
            req.user = null;
            await controller.getAll(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should return data via res.json', async () => {
            const { req, res } = buildReqRes();
            const apps = [buildApplication()];
            applicationService.getAllApplications.mockResolvedValue(apps);
            await controller.getAll(req, res);
            expect(res.json).toHaveBeenCalledWith(apps);
        });

        it('should return 400 on service error', async () => {
            const { req, res } = buildReqRes();
            applicationService.getAllApplications.mockRejectedValue(new Error('fail'));
            await controller.getAll(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('create', () => {
        it('should return 401 when req.user is missing', async () => {
            const { req, res } = buildReqRes();
            req.user = null;
            await controller.create(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should return data on success', async () => {
            const { req, res } = buildReqRes({ body: { company: 'X' } });
            applicationService.createApplication.mockResolvedValue({ id: 1 });
            await controller.create(req, res);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });
    });

    describe('update', () => {
        it('should return 409 for CONFLICTING_EVENT', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 } });
            const err = new Error('Conflict');
            err.code = 'CONFLICTING_EVENT';
            err.conflictData = {};
            applicationService.updateApplication.mockRejectedValue(err);
            await controller.update(req, res);
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'CONFLICTING_EVENT' }));
        });

        it('should return 400 on other errors', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 } });
            applicationService.updateApplication.mockRejectedValue(new Error('bad'));
            await controller.update(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('remove', () => {
        it('should return result on success', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 } });
            applicationService.deleteApplication.mockResolvedValue({ success: true });
            await controller.remove(req, res);
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });
    });

    describe('bulkCreate', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes({ body: { applications: [] } });
            applicationService.bulkCreateApplications.mockResolvedValue({ success: true, count: 0 });
            await controller.bulkCreate(req, res);
            expect(res.json).toHaveBeenCalledWith({ success: true, count: 0 });
        });
    });

    describe('getAnalyticsMetrics', () => {
        it('should return metrics', async () => {
            const { req, res } = buildReqRes();
            applicationService.getAnalyticsMetrics.mockResolvedValue({ timeToReject: { averageDays: 5 } });
            await controller.getAnalyticsMetrics(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ timeToReject: expect.any(Object) }));
        });
    });
});
