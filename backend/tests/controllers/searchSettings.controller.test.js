'use strict';

jest.mock('../../services/searchSettings.service');
const searchService = require('../../services/searchSettings.service');
const controller = require('../../controllers/searchSettings.controller');
const { buildReqRes } = require('../helpers/factories');

describe('searchSettings.controller', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getSettings', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes();
            searchService.getSettings.mockResolvedValue({ keywords: 'node' });
            await controller.getSettings(req, res);
            expect(res.json).toHaveBeenCalledWith({ keywords: 'node' });
        });

        it('should return 400 on error', async () => {
            const { req, res } = buildReqRes();
            searchService.getSettings.mockRejectedValue(new Error('fail'));
            await controller.getSettings(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('putSettings', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes({ body: { keywords: 'react' } });
            searchService.saveSettings.mockResolvedValue({ id: 1 });
            await controller.putSettings(req, res);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });
    });

    describe('getSites', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes();
            searchService.getSites.mockResolvedValue([{ id: 1 }]);
            await controller.getSites(req, res);
            expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
        });
    });

    describe('postSite', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes({ body: { url: 'linkedin.com' } });
            searchService.addSite.mockResolvedValue({ id: 1 });
            await controller.postSite(req, res);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });
    });

    describe('putSite', () => {
        it('should return updated data', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 }, body: {} });
            searchService.updateSite.mockResolvedValue({ id: 1 });
            await controller.putSite(req, res);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });
    });

    describe('deleteSite', () => {
        it('should return result', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 } });
            searchService.deleteSite.mockResolvedValue({ success: true });
            await controller.deleteSite(req, res);
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });
    });
});
