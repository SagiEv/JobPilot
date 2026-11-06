'use strict';

process.env.SUPABASE_URL = 'http://localhost:8000';
process.env.SUPABASE_ANON_KEY = 'dummy';

jest.mock('../../repositories/applications.repository');
jest.mock('../../services/applicationHistory.service');
jest.mock('../../repositories/applicationHistory.repository');
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
const applicationHistoryRepo = require('../../repositories/applicationHistory.repository');
const applicationService = require('../../services/applications.service');
const supabaseClient = require('../../supabaseClient');
const { buildApplication, buildHistoryEntry } = require('../helpers/factories');

describe('applications.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        applicationHistoryRepo.findLatestDatesByAppIds.mockResolvedValue({ data: [], error: null });
        applicationHistoryRepo.findByAppIds.mockResolvedValue({ data: [], error: null });
    });

    describe('getAllApplications', () => {
        it('should return data with last_activity_date enrichment', async () => {
            // Arrange
            const apps = [buildApplication({ id: 1 }), buildApplication({ id: 2 })];
            applicationRepository.findAll.mockResolvedValue({ data: apps, error: null });

            // Act
            const result = await applicationService.getAllApplications('user-123', supabaseClient);

            // Assert
            expect(result).toHaveLength(2);
            expect(applicationRepository.findAll).toHaveBeenCalledWith('user-123', supabaseClient);
        });

        it('should throw on repo error', async () => {
            // Arrange
            applicationRepository.findAll.mockResolvedValue({
                data: null, error: { message: 'DB failed' },
            });

            // Act & Assert
            await expect(applicationService.getAllApplications('user-123', supabaseClient))
                .rejects.toThrow('DB failed');
        });

        it('should return empty array without crashing when no apps exist', async () => {
            // Arrange
            applicationRepository.findAll.mockResolvedValue({ data: [], error: null });

            // Act
            const result = await applicationService.getAllApplications('user-123', supabaseClient);

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
            }, supabaseClient);

            // Assert
            expect(result).toEqual(newApp);
            expect(applicationHistoryService.logChange).toHaveBeenCalledWith(
                10, 'Application Added', null, 'Applied', null, null, 'Application created', '', null, newApp.date || null, supabaseClient
            );
        });

        it('should throw on repo error', async () => {
            // Arrange
            applicationRepository.create.mockResolvedValue({
                data: null, error: { message: 'Insert failed' },
            });

            // Act & Assert
            await expect(applicationService.createApplication('user-123', {}, supabaseClient))
                .rejects.toThrow('Insert failed');
        });

        it('should return existing application idempotently when duplicate already exists in DB on the same day', async () => {
            const existingApp = buildApplication({
                id: 99,
                company: 'Google',
                role_id: 'Frontend Engineer',
                date: '2026-11-06',
            });
            applicationRepository.findDuplicate.mockResolvedValue({ data: existingApp, error: null });

            const result = await applicationService.createApplication('user-123', {
                company: '  google ',
                role_id: 'FRONTEND ENGINEER',
                date: '2026-11-06T18:30:00Z',
            }, supabaseClient);

            expect(result).toEqual(existingApp);
            expect(result._wasDeduplicated).toBe(true);
            expect(applicationRepository.create).not.toHaveBeenCalled();
            expect(applicationHistoryService.logChange).not.toHaveBeenCalled();
        });

        it('should coalesce concurrent in-flight creation requests with same details and date (ignoring hour)', async () => {
            const createdApp = buildApplication({
                id: 42,
                company: 'Meta',
                role_id: 'Backend Engineer',
                date: '2026-11-06',
            });
            applicationRepository.findDuplicate.mockResolvedValue({ data: null, error: null });
            applicationRepository.create.mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve({ data: createdApp, error: null }), 30))
            );
            applicationHistoryService.logChange.mockResolvedValue({});

            const [res1, res2] = await Promise.all([
                applicationService.createApplication('user-123', {
                    company: 'Meta',
                    role_id: 'Backend Engineer',
                    date: '2026-11-06T09:00:00Z',
                }, supabaseClient),
                applicationService.createApplication('user-123', {
                    company: ' meta ',
                    role_id: 'backend engineer',
                    date: '2026-11-06T21:45:00Z',
                }, supabaseClient),
            ]);

            expect(res1).toEqual(createdApp);
            expect(res2).toEqual(createdApp);
            expect(res1._wasDeduplicated).toBeUndefined();
            expect(res2._wasDeduplicated).toBe(true);
            expect(applicationRepository.create).toHaveBeenCalledTimes(1);
            expect(applicationHistoryService.logChange).toHaveBeenCalledTimes(1);
        });
    });

    describe('deleteApplication', () => {
        it('should return { success: true } on success', async () => {
            // Arrange
            applicationRepository.remove.mockResolvedValue({ error: null });

            // Act
            const result = await applicationService.deleteApplication('user-123', 1, supabaseClient);

            // Assert
            expect(result).toEqual({ success: true });
        });

        it('should throw on repo error', async () => {
            // Arrange
            applicationRepository.remove.mockResolvedValue({
                error: { message: 'Delete failed' },
            });

            // Act & Assert
            await expect(applicationService.deleteApplication('user-123', 1, supabaseClient))
                .rejects.toThrow('Delete failed');
        });
    });

    describe('bulkCreateApplications', () => {
        it('should return success count', async () => {
            // Arrange
            const apps = [buildApplication(), buildApplication({ id: 2 })];
            applicationRepository.bulkInsert.mockResolvedValue({ data: apps, error: null });

            // Act
            const result = await applicationService.bulkCreateApplications('user-123', apps, supabaseClient);

            // Assert
            expect(result).toEqual({ success: true, count: 2 });
        });

        it('should throw on repo error', async () => {
            // Arrange
            const err = new Error('Bulk insert failed');
            applicationRepository.bulkInsert.mockResolvedValue({ data: null, error: err });

            // Act & Assert
            await expect(applicationService.bulkCreateApplications('user-123', [], supabaseClient))
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
                }, supabaseClient)
            ).rejects.toThrow('Conflicting event on this date');
        });
    });

    describe('getAnalyticsMetrics', () => {
        it('should extract historicalInterviewAppIds from history transitions', async () => {
            applicationRepository.findAll.mockResolvedValue({
                data: [{ id: 1 }, { id: 2 }, { id: 3 }],
                error: null
            });
            applicationHistoryRepo.findByAppIds.mockResolvedValue({
                data: [
                    { application_id: 1, new_status: 'Interviewing', event_date: '2023-01-01' },
                    { application_id: 1, new_status: 'Rejected', event_date: '2023-01-05' },
                    { application_id: 2, event_type: 'Interview', event_date: '2023-01-02' },
                    { application_id: 3, new_status: 'Rejected', event_date: '2023-01-03' }
                ],
                error: null
            });

            const result = await applicationService.getAnalyticsMetrics('user-123', supabaseClient);
            expect(result.historicalInterviewAppIds).toEqual([1, 2]);
        });

        it('should return zero metrics for empty apps', async () => {
            // Arrange
            applicationRepository.findAll.mockResolvedValue({ data: [], error: null });

            // Act
            const result = await applicationService.getAnalyticsMetrics('user-123', supabaseClient);

            // Assert
            expect(result).toEqual({
                timeToReject: { averageDays: 0, count: 0 },
                timeToInterview: { averageDays: 0, count: 0 },
                timeToOffer: { averageDays: 0, count: 0 },
                hrToTechnical: { averageDays: 0, count: 0 },
                technicalToFinal: { averageDays: 0, count: 0 },
                historicalInterviewAppIds: []
            });
        });

        it('should throw on repo error', async () => {
            // Arrange
            applicationRepository.findAll.mockResolvedValue({
                data: null, error: { message: 'Metrics fetch failed' },
            });

            // Act & Assert
            await expect(applicationService.getAnalyticsMetrics('user-123', supabaseClient))
                .rejects.toThrow('Metrics fetch failed');
        });
    });
});
