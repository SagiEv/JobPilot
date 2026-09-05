'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Email Cron Integration Tests
//
// Tests the cron scheduling layer: pollAllUsers interval gating, due-user
// detection, and timestamp updates after successful polling.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox } = require('./setup.integration');

// Mock IMAP and mailparser to prevent real connections
jest.mock('imapflow', () => ({
    ImapFlow: jest.fn(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        getMailboxLock: jest.fn().mockResolvedValue({ release: jest.fn() }),
        fetch: jest.fn(function* () {}),
        logout: jest.fn().mockResolvedValue(undefined),
    })),
}));
jest.mock('mailparser', () => ({
    simpleParser: jest.fn().mockResolvedValue({
        messageId: 'test', from: { value: [] }, subject: '', text: '', date: new Date(),
    }),
}));
jest.mock('../../utils/encryption', () => ({
    encrypt: jest.fn((v) => `enc_${v}`),
    decrypt: jest.fn((v) => v ? v.replace('enc_', '') : null),
}));

const { pollAllUsers } = require('../../services/mail-poller.service');

describe('Integration: Email Cron Scheduling', () => {
    beforeEach(() => {
        sandbox.reset();
        jest.clearAllMocks();
    });

    it('should skip user whose poll interval has not elapsed', async () => {
        // User has smtp_enabled=true, last polled 2 minutes ago, interval=15 min
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const users = [
            {
                user_id: 'user-1',
                smtp_email: 'user@test.com',
                smtp_host: 'imap.test.com',
                smtp_port: 993,
                smtp_password_encrypted: 'enc_pass',
                smtp_last_uid: '50',
                smtp_poll_interval_min: 15,
            },
        ];

        // pollAllUsers: fetch users with smtp_enabled
        sandbox.onTable('app_settings').forSelect({ data: users, error: null });

        // pollAllUsers: check if user is due
        sandbox.onTable('app_settings').forSelect({
            data: { smtp_last_polled_at: twoMinutesAgo, smtp_poll_interval_min: 15 },
            error: null,
        });

        await pollAllUsers();

        // Should NOT have tried to fetch applications (skipped user)
        const appCalls = sandbox.getCallsTo('applications', 'select');
        expect(appCalls.length).toBe(0);
    });

    it('should poll user whose interval has elapsed', async () => {
        const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
        const users = [
            {
                user_id: 'user-1',
                smtp_email: 'user@test.com',
                smtp_host: 'imap.test.com',
                smtp_port: 993,
                smtp_password_encrypted: 'enc_pass',
                smtp_last_uid: '50',
                smtp_poll_interval_min: 15,
            },
        ];

        // pollAllUsers: fetch users
        sandbox.onTable('app_settings').forSelect({ data: users, error: null });

        // pollAllUsers: check if due — 20 min ago > 15 min interval → should poll
        sandbox.onTable('app_settings')
            .forSelect({
                data: { smtp_last_polled_at: twentyMinutesAgo, smtp_poll_interval_min: 15 },
                error: null,
            })
            // pollUserInbox → updatePolledTimestamp
            .forUpdate({ data: null, error: null });

        // pollUserInbox: fetch applications (empty — short-circuit)
        sandbox.onTable('applications').forSelect({ data: [], error: null });

        await pollAllUsers();

        // Verify applications were fetched (poll was attempted)
        const appCalls = sandbox.getCallsTo('applications', 'select');
        expect(appCalls.length).toBe(1);
    });

    it('should update smtp_last_polled_at after successful poll', async () => {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const users = [
            {
                user_id: 'user-1',
                smtp_email: 'user@test.com',
                smtp_host: 'imap.test.com',
                smtp_port: 993,
                smtp_password_encrypted: 'enc_pass',
                smtp_last_uid: null,
                smtp_poll_interval_min: 15,
            },
        ];

        sandbox.onTable('app_settings').forSelect({ data: users, error: null });
        sandbox.onTable('app_settings')
            .forSelect({
                data: { smtp_last_polled_at: thirtyMinutesAgo, smtp_poll_interval_min: 15 },
                error: null,
            })
            .forUpdate({ data: null, error: null });

        sandbox.onTable('applications').forSelect({ data: [], error: null });

        await pollAllUsers();

        // Verify app_settings was updated (polling timestamp)
        const settingsUpdateCalls = sandbox.getCallsTo('app_settings', 'update');
        expect(settingsUpdateCalls.length).toBeGreaterThanOrEqual(1);
    });
});
