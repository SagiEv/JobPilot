'use strict';

const applicationService = require('../../services/applications.service');
const applicationRepository = require('../../repositories/applications.repository');
const applicationHistoryService = require('../../services/applicationHistory.service');
const { sandbox } = require('./setup.integration');
const { buildUser, buildApplication } = require('../helpers/factories');

// We test the service layer directly (not via HTTP) to focus on the
// multi-step status-recalculation logic without HTTP serialization noise.
// The repository and history service are mocked at their module boundary.

jest.mock('../../repositories/applications.repository');
jest.mock('../../services/applicationHistory.service');

describe('Integration: Application Lifecycle (Status Machine)', () => {
    const userId = 'user-uuid-123';

    beforeEach(() => {
        jest.clearAllMocks();
        sandbox.reset();
    });

    // ── Scenario 1: Happy path lifecycle ──────────────────────────────────

    it('Happy path: Applied → Interviewing/HR → Interviewing/Technical → Offer', async () => {
        // Step 1: Create application
        const app = buildApplication({ id: 1, status: 'Applied', stage: null });
        applicationRepository.create.mockResolvedValue({ data: app, error: null });
        applicationHistoryService.logChange.mockResolvedValue({});

        const created = await applicationService.createApplication(userId, {
            company: 'TestCorp', position: 'Engineer', status: 'Applied',
        });
        expect(created.status).toBe('Applied');
        expect(applicationHistoryService.logChange).toHaveBeenCalledWith(
            1, 'Application Added', null, 'Applied', null, null, 'Application created'
        );

        // Step 2: Update to Interviewing / HR Screen
        applicationRepository.findById.mockResolvedValue({
            data: { id: 1, status: 'Applied', stage: null },
        });
        applicationRepository.update.mockImplementation((uid, id, data) =>
            Promise.resolve({ data: { ...data, id }, error: null })
        );
        applicationHistoryService.getHistoryByApplicationId
            .mockResolvedValueOnce([]) // conflict check
            .mockResolvedValueOnce([   // recalculation
                { id: 2, event_date: '2025-02-01T00:00:00Z', new_status: 'Interviewing', new_stage: 'HR Screen' },
                { id: 1, event_date: '2025-01-01T00:00:00Z', new_status: 'Applied', new_stage: null },
            ]);

        const step2 = await applicationService.updateApplication(userId, 1, {
            status: 'Interviewing', stage: 'HR Screen', event_date: '2025-02-01',
        });
        expect(step2.status).toBe('Interviewing');
        expect(step2.stage).toBe('HR Screen');

        // Step 3: Update to Interviewing / Technical Interview
        applicationRepository.findById.mockResolvedValue({
            data: { id: 1, status: 'Interviewing', stage: 'HR Screen' },
        });
        applicationHistoryService.getHistoryByApplicationId
            .mockResolvedValueOnce([]) // conflict check
            .mockResolvedValueOnce([   // recalculation
                { id: 3, event_date: '2025-03-01T00:00:00Z', new_status: 'Interviewing', new_stage: 'Technical Interview' },
                { id: 2, event_date: '2025-02-01T00:00:00Z', new_status: 'Interviewing', new_stage: 'HR Screen' },
                { id: 1, event_date: '2025-01-01T00:00:00Z', new_status: 'Applied', new_stage: null },
            ]);

        const step3 = await applicationService.updateApplication(userId, 1, {
            status: 'Interviewing', stage: 'Technical Interview', event_date: '2025-03-01',
        });
        expect(step3.stage).toBe('Technical Interview');

        // Step 4: Update to Offer
        applicationRepository.findById.mockResolvedValue({
            data: { id: 1, status: 'Interviewing', stage: 'Technical Interview' },
        });
        applicationHistoryService.getHistoryByApplicationId
            .mockResolvedValueOnce([]) // conflict check
            .mockResolvedValueOnce([   // recalculation
                { id: 4, event_date: '2025-04-01T00:00:00Z', new_status: 'Offer', new_stage: null },
                { id: 3, event_date: '2025-03-01T00:00:00Z', new_status: 'Interviewing', new_stage: 'Technical Interview' },
            ]);

        const step4 = await applicationService.updateApplication(userId, 1, {
            status: 'Offer', event_date: '2025-04-01',
        });
        expect(step4.status).toBe('Offer');

        // Verify logChange was called for each status transition (create + 3 updates)
        expect(applicationHistoryService.logChange).toHaveBeenCalledTimes(4);
    });

    // ── Scenario 2: Backdated event doesn't regress status ────────────────

    it('Backdated event: final status stays at most-recent event', async () => {
        applicationRepository.findById.mockResolvedValue({
            data: { id: 1, status: 'Interviewing', stage: 'Technical Interview' },
        });
        applicationRepository.update.mockImplementation((uid, id, data) =>
            Promise.resolve({ data: { ...data, id }, error: null })
        );
        applicationHistoryService.logChange.mockResolvedValue({});
        applicationHistoryService.getHistoryByApplicationId
            .mockResolvedValueOnce([]) // conflict check — no conflict on the old date
            .mockResolvedValueOnce([   // recalculation — Interviewing is newest
                { id: 2, event_date: '2025-03-15T00:00:00Z', new_status: 'Interviewing', new_stage: 'Technical Interview' },
                { id: 3, event_date: '2025-01-10T00:00:00Z', new_status: 'Assessment', new_stage: 'Online Test' },
                { id: 1, event_date: '2025-01-01T00:00:00Z', new_status: 'Applied', new_stage: null },
            ]);

        const result = await applicationService.updateApplication(userId, 1, {
            status: 'Assessment', stage: 'Online Test',
            event_date: '2025-01-10T00:00:00Z', // backdated
        });

        expect(result.status).toBe('Interviewing');
        expect(result.stage).toBe('Technical Interview');
    });

    // ── Scenario 3: Rejection fields cleared on status change ─────────────

    it('Moving away from Rejected clears rejection_reason and automatic_rejection', async () => {
        applicationRepository.findById.mockResolvedValue({
            data: {
                id: 1, status: 'Rejected', stage: null,
                rejection_reason: 'Not a fit', automatic_rejection: true,
            },
        });
        applicationRepository.update.mockImplementation((uid, id, data) =>
            Promise.resolve({ data: { ...data, id }, error: null })
        );
        applicationHistoryService.logChange.mockResolvedValue({});
        applicationHistoryService.getHistoryByApplicationId
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([
                { id: 3, event_date: '2025-05-01T00:00:00Z', new_status: 'Offer', new_stage: null },
                { id: 2, event_date: '2025-04-01T00:00:00Z', new_status: 'Rejected', new_stage: null },
            ]);

        const result = await applicationService.updateApplication(userId, 1, { status: 'Offer' });

        expect(result.status).toBe('Offer');
        expect(applicationRepository.update).toHaveBeenCalledWith(userId, 1, expect.objectContaining({
            rejection_reason: null,
            automatic_rejection: false,
        }));
    });

    // ── Scenario 4: Conflict resolution — keep_both ───────────────────────

    it('Conflict resolution: keep_both creates two history entries on same date', async () => {
        const targetDate = '2025-06-15';
        applicationRepository.findById.mockResolvedValue({
            data: { id: 1, status: 'Applied', stage: null },
        });
        applicationRepository.update.mockImplementation((uid, id, data) =>
            Promise.resolve({ data: { ...data, id }, error: null })
        );
        applicationHistoryService.logChange.mockResolvedValue({});
        applicationHistoryService.updateHistory = jest.fn().mockResolvedValue({});

        // First call: conflict check returns existing event on same date
        applicationHistoryService.getHistoryByApplicationId
            .mockResolvedValueOnce([
                {
                    id: 10, event_date: `${targetDate}T00:00:00Z`,
                    event_type: 'Status Change',
                    new_status: 'Assessment', new_stage: 'Online Test',
                },
            ])
            // Second call: recalculation
            .mockResolvedValueOnce([
                { id: 11, event_date: `${targetDate}T00:00:00Z`, new_status: 'Interviewing', new_stage: 'HR Screen' },
                { id: 10, event_date: `${targetDate}T00:00:00Z`, new_status: 'Assessment', new_stage: 'Online Test' },
            ]);

        await applicationService.updateApplication(userId, 1, {
            status: 'Interviewing', stage: 'HR Screen',
            event_date: `${targetDate}T12:00:00Z`,
            conflict_resolution: 'keep_both',
        });

        // logChange should have been called (keep_both → new entry created)
        expect(applicationHistoryService.logChange).toHaveBeenCalled();
        // updateHistory should NOT have been called (that's overwrite mode)
        expect(applicationHistoryService.updateHistory).not.toHaveBeenCalled();
    });

    // ── Scenario 5: Conflict resolution — overwrite ───────────────────────

    it('Conflict resolution: overwrite mutates existing history entry', async () => {
        const targetDate = '2025-06-15';
        applicationRepository.findById.mockResolvedValue({
            data: { id: 1, status: 'Applied', stage: null },
        });
        applicationRepository.update.mockImplementation((uid, id, data) =>
            Promise.resolve({ data: { ...data, id }, error: null })
        );
        applicationHistoryService.logChange.mockResolvedValue({});
        applicationHistoryService.updateHistory = jest.fn().mockResolvedValue({});

        applicationHistoryService.getHistoryByApplicationId
            .mockResolvedValueOnce([
                {
                    id: 10, event_date: `${targetDate}T00:00:00Z`,
                    event_type: 'Status Change',
                    new_status: 'Assessment', new_stage: 'Online Test',
                },
            ])
            .mockResolvedValueOnce([
                { id: 10, event_date: `${targetDate}T00:00:00Z`, new_status: 'Interviewing', new_stage: 'HR Screen' },
            ]);

        await applicationService.updateApplication(userId, 1, {
            status: 'Interviewing', stage: 'HR Screen',
            event_date: `${targetDate}T12:00:00Z`,
            conflict_resolution: 'overwrite',
        });

        expect(applicationHistoryService.updateHistory).toHaveBeenCalledWith(10, expect.objectContaining({
            new_status: 'Interviewing',
            new_stage: 'HR Screen',
        }));
    });

    // ── Scenario 6: Duplicate event (same status, same stage, same date) ──

    it('Exact duplicate event is ignored — no new history entry', async () => {
        const targetDate = '2025-06-15';
        applicationRepository.findById.mockResolvedValue({
            data: { id: 1, status: 'Interviewing', stage: 'HR Screen' },
        });
        applicationRepository.update.mockImplementation((uid, id, data) =>
            Promise.resolve({ data: { ...data, id }, error: null })
        );
        applicationHistoryService.logChange.mockResolvedValue({});

        applicationHistoryService.getHistoryByApplicationId
            .mockResolvedValueOnce([
                {
                    id: 10, event_date: `${targetDate}T00:00:00Z`,
                    event_type: 'Status Change',
                    new_status: 'Interviewing', new_stage: 'HR Screen', // exact same
                },
            ])
            .mockResolvedValueOnce([
                { id: 10, event_date: `${targetDate}T00:00:00Z`, new_status: 'Interviewing', new_stage: 'HR Screen' },
            ]);

        await applicationService.updateApplication(userId, 1, {
            status: 'Interviewing', stage: 'HR Screen',
            event_date: `${targetDate}T12:00:00Z`,
        });

        // logChange should NOT have been called (duplicate suppressed)
        expect(applicationHistoryService.logChange).not.toHaveBeenCalled();
    });
});
