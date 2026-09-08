'use strict';

jest.mock('../../services/rss.service');
const rssService = require('../../services/rss.service');
const controller = require('../../controllers/rss.controller');
const { buildReqRes } = require('../helpers/factories');

describe('rss.controller', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getFeeds', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes();
            rssService.getFeeds.mockResolvedValue([{ id: 1 }]);
            await controller.getFeeds(req, res);
            expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
        });

        it('should return 400 on error', async () => {
            const { req, res } = buildReqRes();
            rssService.getFeeds.mockRejectedValue(new Error('fail'));
            await controller.getFeeds(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('postFeed', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes({ body: { url: 'rss.com' } });
            rssService.addFeed.mockResolvedValue({ id: 1 });
            await controller.postFeed(req, res);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });
    });

    describe('putFeed', () => {
        it('should return updated data', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 }, body: {} });
            rssService.updateFeed.mockResolvedValue({ id: 1 });
            await controller.putFeed(req, res);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });
    });

    describe('deleteFeed', () => {
        it('should return result', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 } });
            rssService.deleteFeed.mockResolvedValue({ success: true });
            await controller.deleteFeed(req, res);
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });
    });

    describe('getJobs', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes();
            rssService.getJobs.mockResolvedValue([{ id: 1 }]);
            await controller.getJobs(req, res);
            expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
        });
    });
});
