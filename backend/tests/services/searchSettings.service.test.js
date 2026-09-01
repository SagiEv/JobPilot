'use strict';

jest.mock('../../repositories/searchSettings.repository');
const searchRepo = require('../../repositories/searchSettings.repository');
const searchService = require('../../services/searchSettings.service');

describe('searchSettings.service', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getSettings', () => {
        it('should return data', async () => {
            searchRepo.findSettings.mockResolvedValue({ data: { keywords: 'node' }, error: null });
            const result = await searchService.getSettings('user-123');
            expect(result).toEqual({ keywords: 'node' });
        });

        it('should return {} on PGRST116', async () => {
            searchRepo.findSettings.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'nf' } });
            const result = await searchService.getSettings('user-123');
            expect(result).toEqual({});
        });

        it('should throw on other errors', async () => {
            searchRepo.findSettings.mockResolvedValue({ data: null, error: { code: 'X', message: 'fail' } });
            await expect(searchService.getSettings('u')).rejects.toThrow('fail');
        });
    });

    describe('saveSettings', () => {
        it('should return saved data', async () => {
            searchRepo.upsertSettings.mockResolvedValue({ data: { id: 1 }, error: null });
            const result = await searchService.saveSettings('user-123', { id: 1, keywords: 'react' });
            expect(result).toEqual({ id: 1 });
        });

        it('should throw on error', async () => {
            searchRepo.upsertSettings.mockResolvedValue({ data: null, error: { message: 'fail' } });
            await expect(searchService.saveSettings('u', {})).rejects.toThrow('fail');
        });
    });

    describe('getSites', () => {
        it('should return data', async () => {
            searchRepo.findAllSites.mockResolvedValue({ data: [{ id: 1 }], error: null });
            const result = await searchService.getSites('user-123');
            expect(result).toEqual([{ id: 1 }]);
        });
    });

    describe('addSite', () => {
        it('should return new site', async () => {
            searchRepo.createSite.mockResolvedValue({ data: { id: 2 }, error: null });
            const result = await searchService.addSite('user-123', { url: 'linkedin.com' });
            expect(result.id).toBe(2);
        });
    });

    describe('updateSite', () => {
        it('should return updated site', async () => {
            searchRepo.updateSite.mockResolvedValue({ data: { id: 1 }, error: null });
            const result = await searchService.updateSite('user-123', 1, {});
            expect(result.id).toBe(1);
        });
    });

    describe('deleteSite', () => {
        it('should return { success: true }', async () => {
            searchRepo.removeSite.mockResolvedValue({ error: null });
            const result = await searchService.deleteSite('user-123', 1);
            expect(result).toEqual({ success: true });
        });

        it('should throw on error', async () => {
            searchRepo.removeSite.mockResolvedValue({ error: { message: 'fail' } });
            await expect(searchService.deleteSite('u', 1)).rejects.toThrow('fail');
        });
    });
});
