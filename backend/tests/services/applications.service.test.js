'use strict';

process.env.SUPABASE_URL = 'http://localhost:8000';
process.env.SUPABASE_ANON_KEY = 'dummy';

jest.mock('../../repositories/applications.repository');
jest.mock('../../services/applicationHistory.service');
jest.mock('../../supabaseClient', () => {
    const chain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
    };
    // Make the chain awaitable — resolves to { data: [], error: null }
    chain.then = jest.fn((resolve) => resolve({ data: [], error: null }));
    return {
        from: jest.fn(() => chain),
        __chain: chain,
    };
});

const applicationRepository = require('../../repositories/applications.repository');
const applicationHistoryService = require('../../services/applicationHistory.service');
const applicationService = require('../../services/applications.service');
const { buildApplication, buildHistoryEntry } = require('../helpers/factories');

describe('applications.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllApplications', () => {
        it('should return data with last_activity_date enrichment', async () => {
            // Arrange
            const apps = [buildApplication({ id: 1 }), buildApplication({ id: 2 })];
            applicationRepository.findAll.mockResolvedValue({ data: apps, error: null });

            // Act
            const result = await applicationService.getAllApplications('user-123');

            // Assert
            expect(result).toHaveLength(2);
            expect(applicationRepository.findAll).toHaveBeenCalledWith('user-123');
        });

        it('should throw on repo error', async () => {
            // Arrange
            applicationRepository.findAll.mockResolvedValue({
                data: null, error: { message: 'DB failed' },
            });

            // Act & Assert
            await expect(applicationService.getAllApplications('user-123'))
                .rejects.toThrow('DB failed');
        });

        it('should return empty array without crashing when no apps exist', async () => {
            // Arrange
            applicationRepository.findAll.mockResolvedValue({ data: [], error: null });

            // Act
            const result = await applicationService.getAllApplications('user-123');

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('createApplication', () => {
        it('should create app and log "Application Added" history', async () => {
            // Arrange
            const newApp = buildApplication({ id: 10, status: 'Applied', stage: null });
            applicationRepository.create.mockResolvedValue({ data: newApp, error: null });
            applicationHistoryService.logChange.mockResolvedValue({});

            // Act
            const result = await applicationService.createApplication('user-123', {
                company: 'TestCorp', position: 'SWE',
            });

            // Assert
            expect(result).toEqual(newApp);
            expect(applicationHistoryService.logChange).toHaveBeenCalledWith(
                10, 'Application Added', null, 'Applied', null, null, 'Application created'
            );
        });

        it('should throw on repo error', async () => {
            // Arrange
            applicationRepository.create.mockResolvedValue({
                data: null, error: { message: 'Insert failed' },
            });

            // Act & Assert
            await expect(applicationService.createApplication('user-123', {}))
                .rejects.toThrow('Insert failed');
        });
    });

    describe('deleteApplication', () => {
        it('should return { success: true } on success', async () => {
            // Arrange
            applicationRepository.remove.mockResolvedValue({ error: null });

            // Act
            const result = await applicationService.deleteApplication('user-123', 1);

            // Assert
            expect(result).toEqual({ success: true });
        });

        it('should throw on repo error', async () => {
            // Arrange
            applicationRepository.remove.mockResolvedValue({
                error: { message: 'Delete failed' },
            });

            // Act & Assert
            await expect(applicationService.deleteApplication('user-123', 1))
                .rejects.toThrow('Delete failed');
        });
    });

    describe('bulkCreateApplications', () => {
        it('should return success count', async () => {
            // Arrange
            const apps = [buildApplication(), buildApplication({ id: 2 })];
            applicationRepository.bulkInsert.mockResolvedValue({ data: apps, error: null });

            // Act
            const result = await applicationService.bulkCreateApplications('user-123', apps);

            // Assert
            expect(result).toEqual({ success: true, count: 2 });
        });

        it('should throw on repo error', async () => {
            // Arrange
            const err = new Error('Bulk insert failed');
            applicationRepository.bulkInsert.mockResolvedValue({ data: null, error: err });

            // Act & Assert
            await expect(applicationService.bulkCreateApplications('user-123', []))
                .rejects.toThrow();
        });
    });

    describe('updateApplication — conflict detection', () => {
        it('should throw CONFLICTING_EVENT when conflict exists and no resolution', async () => {
            // Arrange
            const oldApp = buildApplication({ id: 1, status: 'Applied', stage: null });
            applicationRepository.findById.mockResolvedValue({ data: oldApp });
            applicationRepository.update.mockImplementation((uid, id, d) =>
                Promise.resolve({ data: { ...d, id } })
            );
            applicationHistoryService.logChange.mockResolvedValue({});

            const today = new Date().toISOString().split('T')[0];
            applicationHistoryService.getHistoryByApplicationId.mockResolvedValue([
                buildHistoryEntry({
                    id: 5,
                    event_date: new Date().toISOString(),
                    new_status: 'Assessment',
                    new_stage: null,
                }),
            ]);

            // Act & Assert
            await expect(
                applicationService.updateApplication('user-123', 1, {
                    status: 'Interviewing',
                    stage: null,
                })
            ).rejects.toThrow('Conflicting event on this date');
        });
    });

    describe('getAnalyticsMetrics', () => {
        it('should return zero metrics for empty apps', async () => {
            // Arrange
            applicationRepository.findAll.mockResolvedValue({ data: [], error: null });

            // Act
            const result = await applicationService.getAnalyticsMetrics('user-123');

            // Assert
            expect(result).toEqual({
                timeToReject: { averageDays: 0, count: 0 },
                timeToInterview: { averageDays: 0, count: 0 },
                timeToOffer: { averageDays: 0, count: 0 },
                hrToTechnical: { averageDays: 0, count: 0 },
                technicalToFinal: { averageDays: 0, count: 0 },
            });
        });

        it('should throw on repo error', async () => {
            // Arrange
            applicationRepository.findAll.mockResolvedValue({
                data: null, error: { message: 'Metrics fetch failed' },
            });

            // Act & Assert
            await expect(applicationService.getAnalyticsMetrics('user-123'))
                .rejects.toThrow('Metrics fetch failed');
        });
    });
});
