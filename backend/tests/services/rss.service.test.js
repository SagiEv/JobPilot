'use strict';

jest.mock('../../repositories/rss.repository');
const rssRepo = require('../../repositories/rss.repository');
const rssService = require('../../services/rss.service');

describe('rss.service', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getFeeds', () => {
        it('should return data', async () => {
            rssRepo.findAllFeeds.mockResolvedValue({ data: [{ id: 1 }], error: null });
            const result = await rssService.getFeeds();
            expect(result).toEqual([{ id: 1 }]);
        });

        it('should throw on error', async () => {
            rssRepo.findAllFeeds.mockResolvedValue({ data: null, error: { message: 'fail' } });
            await expect(rssService.getFeeds()).rejects.toThrow('fail');
        });
    });

    describe('addFeed', () => {
        it('should return new feed', async () => {
            rssRepo.createFeed.mockResolvedValue({ data: { id: 2 }, error: null });
            const result = await rssService.addFeed({ url: 'rss.com' });
            expect(result.id).toBe(2);
        });

        it('should throw on error', async () => {
            rssRepo.createFeed.mockResolvedValue({ data: null, error: { message: 'fail' } });
            await expect(rssService.addFeed({})).rejects.toThrow('fail');
        });
    });

    describe('updateFeed', () => {
        it('should set updated_at and return data', async () => {
            rssRepo.updateFeed.mockResolvedValue({ data: { id: 1 }, error: null });
            const result = await rssService.updateFeed(1, { name: 'Updated' });
            expect(result.id).toBe(1);
            // Verify updated_at was set
            expect(rssRepo.updateFeed).toHaveBeenCalledWith(1, expect.objectContaining({
                updated_at: expect.any(String),
            }));
        });

        it('should throw on error', async () => {
            rssRepo.updateFeed.mockResolvedValue({ data: null, error: { message: 'fail' } });
            await expect(rssService.updateFeed(1, {})).rejects.toThrow('fail');
        });
    });

    describe('deleteFeed', () => {
        it('should return { success: true }', async () => {
            rssRepo.removeFeed.mockResolvedValue({ error: null });
            const result = await rssService.deleteFeed(1);
            expect(result).toEqual({ success: true });
        });

        it('should throw on error', async () => {
            rssRepo.removeFeed.mockResolvedValue({ error: { message: 'fail' } });
            await expect(rssService.deleteFeed(1)).rejects.toThrow('fail');
        });
    });

    describe('getJobs', () => {
        it('should return data', async () => {
            rssRepo.findAllJobs.mockResolvedValue({ data: [{ id: 1 }], error: null });
            const result = await rssService.getJobs();
            expect(result).toEqual([{ id: 1 }]);
        });

        it('should throw on error', async () => {
            rssRepo.findAllJobs.mockResolvedValue({ data: null, error: { message: 'fail' } });
            await expect(rssService.getJobs()).rejects.toThrow('fail');
        });
    });
});
