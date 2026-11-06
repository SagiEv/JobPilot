'use strict';

jest.mock('../../repositories/notifications.repository');
jest.mock('../../repositories/applications.repository');
jest.mock('../../repositories/applicationHistory.repository');
jest.mock('../../services/applicationHistory.service');
jest.mock('../../services/applications.service');

const notificationsRepo = require('../../repositories/notifications.repository');
const applicationRepo = require('../../repositories/applications.repository');
const applicationHistoryRepo = require('../../repositories/applicationHistory.repository');
const applicationHistoryService = require('../../services/applicationHistory.service');
const applicationsService = require('../../services/applications.service');
const notificationsService = require('../../services/notifications.service');

describe('notifications.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('revertNotification', () => {
        it('should successfully revert an application status and date using metadata without polluting activity log', async () => {
            const notif = {
                id: 1,
                user_id: 'user-1',
                application_id: 10,
                type: 'email_sync',
                title: 'Application Rejected: Google',
                body: 'Status updated to "Rejected" based on email',
                reverted: false,
                metadata: {
                    previous_status: 'Interviewing',
                    previous_date: '2026-10-15',
                    new_status: 'Rejected'
                }
            };
            const app = { id: 10, user_id: 'user-1', status: 'Rejected', stage: 'Round 2', date: '2026-11-06' };

            notificationsRepo.findById.mockResolvedValue({ data: notif, error: null });
            applicationRepo.findById.mockResolvedValue({ data: app, error: null });
            applicationHistoryService.getHistoryByApplicationId.mockResolvedValue([]);
            applicationRepo.update.mockResolvedValue({ data: { ...app, status: 'Interviewing', date: '2026-10-15' }, error: null });
            notificationsRepo.update.mockResolvedValue({ data: { ...notif, reverted: true }, error: null });

            const result = await notificationsService.revertNotification('user-1', 1, {});

            expect(result.success).toBe(true);
            expect(result.previousStatus).toBe('Interviewing');
            expect(applicationRepo.update).toHaveBeenCalledWith(
                'user-1',
                10,
                expect.objectContaining({ status: 'Interviewing', date: '2026-10-15', rejection_reason: null, automatic_rejection: false }),
                expect.anything()
            );
            // Verify activity log is not polluted with a Note
            expect(applicationHistoryService.logChange).not.toHaveBeenCalled();
            expect(notificationsRepo.update).toHaveBeenCalledWith(
                'user-1',
                1,
                expect.objectContaining({ reverted: true }),
                expect.anything()
            );
        });

        it('should deduce previous status and date from history when metadata is absent (legacy)', async () => {
            const notif = {
                id: 2,
                user_id: 'user-1',
                application_id: 20,
                type: 'email_sync',
                title: 'Application Rejected: Meta',
                body: 'Status updated to "Rejected" based on email from recruiter@meta.com',
                reverted: false
            };
            const app = { id: 20, user_id: 'user-1', status: 'Rejected', stage: 'Applied', date: '2026-11-06' };
            const history = [
                {
                    id: 99,
                    application_id: 20,
                    old_status: 'Applied',
                    new_status: 'Rejected',
                    event_date: '2026-11-06',
                    notes: 'Status auto-updated based on email from recruiter@meta.com.'
                },
                {
                    id: 50,
                    application_id: 20,
                    old_status: null,
                    new_status: 'Applied',
                    event_date: '2026-10-01',
                    notes: 'Application created'
                }
            ];

            notificationsRepo.findById.mockResolvedValue({ data: notif, error: null });
            applicationRepo.findById.mockResolvedValue({ data: app, error: null });
            applicationHistoryService.getHistoryByApplicationId.mockResolvedValue(history);
            applicationHistoryRepo.remove.mockResolvedValue({ error: null });
            applicationRepo.update.mockResolvedValue({ data: { ...app, status: 'Applied', date: '2026-10-01' }, error: null });
            notificationsRepo.update.mockResolvedValue({ data: { ...notif, reverted: true }, error: null });

            const result = await notificationsService.revertNotification('user-1', 2, {});

            expect(result.success).toBe(true);
            expect(result.previousStatus).toBe('Applied');
            expect(applicationHistoryRepo.remove).toHaveBeenCalledWith(99, expect.anything());
            expect(applicationRepo.update).toHaveBeenCalledWith(
                'user-1',
                20,
                expect.objectContaining({ status: 'Applied', date: '2026-10-01' }),
                expect.anything()
            );
            expect(applicationHistoryService.logChange).not.toHaveBeenCalled();
        });

        it('should throw 404 when notification does not exist', async () => {
            notificationsRepo.findById.mockResolvedValue({ data: null, error: null });
            await expect(notificationsService.revertNotification('user-1', 999, {}))
                .rejects.toThrow('Notification not found');
        });

        it('should throw 400 when notification has already been reverted', async () => {
            const notif = { id: 1, user_id: 'user-1', application_id: 10, reverted: true };
            notificationsRepo.findById.mockResolvedValue({ data: notif, error: null });
            await expect(notificationsService.revertNotification('user-1', 1, {}))
                .rejects.toThrow('Notification has already been reverted');
        });

        it('should throw 400 when notification has no application_id', async () => {
            const notif = { id: 1, user_id: 'user-1', application_id: null, reverted: false };
            notificationsRepo.findById.mockResolvedValue({ data: notif, error: null });
            await expect(notificationsService.revertNotification('user-1', 1, {}))
                .rejects.toThrow('Notification is not associated with an application');
        });
    });

    describe('unrevertNotification', () => {
        it('should successfully undo a revert and restore the status', async () => {
            const notif = {
                id: 1,
                user_id: 'user-1',
                application_id: 10,
                reverted: true,
                metadata: {
                    previous_status: 'Applied',
                    original_status_before_revert: 'Rejected',
                    reverted: true
                }
            };
            const app = { id: 10, user_id: 'user-1', status: 'Applied' };

            notificationsRepo.findById.mockResolvedValue({ data: notif, error: null });
            applicationRepo.findById.mockResolvedValue({ data: app, error: null });
            applicationsService.updateApplication.mockResolvedValue({ ...app, status: 'Rejected' });
            notificationsRepo.update.mockResolvedValue({ data: { ...notif, reverted: false }, error: null });

            const result = await notificationsService.unrevertNotification('user-1', 1, {});

            expect(result.success).toBe(true);
            expect(result.restoredStatus).toBe('Rejected');
            expect(applicationsService.updateApplication).toHaveBeenCalledWith(
                'user-1',
                10,
                expect.objectContaining({ status: 'Rejected' }),
                expect.anything()
            );
            expect(notificationsRepo.update).toHaveBeenCalledWith(
                'user-1',
                1,
                expect.objectContaining({ reverted: false }),
                expect.anything()
            );
        });

        it('should throw 400 when trying to undo an unreverted notification', async () => {
            const notif = { id: 1, user_id: 'user-1', application_id: 10, reverted: false };
            notificationsRepo.findById.mockResolvedValue({ data: notif, error: null });
            await expect(notificationsService.unrevertNotification('user-1', 1, {}))
                .rejects.toThrow('Notification is not in a reverted state');
        });
    });
});

