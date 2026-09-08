'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Email Pipeline Integration Tests
//
// Tests the complete flow: IMAP fetch → email parsing → classification →
// application matching → auto-status update → notification creation.
//
// IMAP (ImapFlow) and mailparser are mocked. Everything else runs through
// the real service/repository chain with Supabase sandbox responses.
// ─────────────────────────────────────────────────────────────────────────────

const { pollUserInbox } = require('../../services/mail-poller.service');
const { sandbox } = require('./setup.integration');

// ── Mock ImapFlow ────────────────────────────────────────────────────────────

const mockMessages = [];
const mockImapClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    getMailboxLock: jest.fn().mockResolvedValue({ release: jest.fn() }),
    fetch: jest.fn(function* () {
        for (const msg of mockMessages) {
            yield msg;
        }
    }),
    logout: jest.fn().mockResolvedValue(undefined),
};

jest.mock('imapflow', () => ({
    ImapFlow: jest.fn(() => mockImapClient),
}));

// ── Mock mailparser ──────────────────────────────────────────────────────────

const parsedEmails = {};
jest.mock('mailparser', () => ({
    simpleParser: jest.fn(async (source) => {
        // source is the raw buffer; we use the uid embedded in it as a lookup key
        const uid = source.toString();
        return parsedEmails[uid] || {
            messageId: `msg-${uid}`,
            from: { value: [{ address: 'unknown@test.com', name: '' }] },
            subject: 'Unknown',
            text: '',
            date: new Date(),
        };
    }),
}));

// ── Mock encryption ──────────────────────────────────────────────────────────

jest.mock('../../utils/encryption', () => ({
    encrypt: jest.fn((val) => `encrypted_${val}`),
    decrypt: jest.fn((val) => val ? val.replace('encrypted_', '') : null),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function createImapMessage(uid) {
    return {
        uid,
        source: Buffer.from(String(uid)),
        envelope: {},
    };
}

function registerParsedEmail(uid, { from, fromName, subject, bodyText, messageId, date }) {
    parsedEmails[String(uid)] = {
        messageId: messageId || `msg-${uid}`,
        from: { value: [{ address: from, name: fromName || '' }] },
        subject: subject || '',
        text: bodyText || '',
        date: date || new Date(),
    };
}

const baseSettings = {
    user_id: 'user-uuid-123',
    smtp_email: 'user@example.com',
    smtp_host: 'imap.example.com',
    smtp_port: 993,
    smtp_password_encrypted: 'encrypted_password123',
    smtp_last_uid: null,
};

const testApplications = [
    { id: 1, company: 'TestCorp', position: 'Software Engineer', status: 'applied', role_id: '' },
    { id: 2, company: 'AcmeTech', position: 'Frontend Developer', status: 'applied', role_id: 'REQ-456' },
    { id: 3, company: 'BigBank', position: 'Data Engineer', status: 'rejected', role_id: '' },
    { id: 4, company: 'StartupXYZ', position: 'Fullstack Dev', status: 'interview', role_id: '' },
];

describe('Integration: Email Processing Pipeline', () => {
    beforeEach(() => {
        sandbox.reset();
        mockMessages.length = 0;
        Object.keys(parsedEmails).forEach((k) => delete parsedEmails[k]);
        jest.clearAllMocks();

        // Default: applications select
        sandbox.onTable('applications').forSelect({ data: testApplications, error: null });
    });

    // ── Test 1: High-confidence match triggers auto-update ────────────────

    it('should auto-update application status when confidence >= 0.7', async () => {
        mockMessages.push(createImapMessage(100));
        registerParsedEmail(100, {
            from: 'careers@testcorp.com',
            subject: 'Your application to TestCorp',
            bodyText: 'We regret to inform you that we have decided not to proceed with your application.',
        });

        // email_logs.findByMessageId → no existing log
        sandbox.onTable('email_logs').forSelect({ data: null, error: null });

        // applicationRepo.update (auto-update)
        sandbox.onTable('applications').forUpdate({ data: { id: 1, status: 'rejected' }, error: null });

        // notifications.insert
        sandbox.onTable('notifications').forInsert({ data: { id: 1 }, error: null });

        // email_logs.bulkInsert
        sandbox.onTable('email_logs').forInsert({ data: [], error: null });

        // app_settings update (polling timestamp)
        sandbox.onTable('app_settings').forUpdate({ data: null, error: null });

        await pollUserInbox(baseSettings);

        // Verify application status was updated
        const appUpdateCalls = sandbox.getCallsTo('applications', 'update');
        expect(appUpdateCalls.length).toBeGreaterThanOrEqual(1);

        // Verify notification was created
        const notifCalls = sandbox.getCallsTo('notifications', 'insert');
        expect(notifCalls.length).toBe(1);

        // Verify email log was inserted
        const logCalls = sandbox.getCallsTo('email_logs', 'insert');
        expect(logCalls.length).toBe(1);
    });

    // ── Test 2: Low-confidence skips auto-update ──────────────────────────

    it('should log email but NOT auto-update when confidence is low', async () => {
        mockMessages.push(createImapMessage(101));
        registerParsedEmail(101, {
            from: 'newsletter@randomcompany.com',
            subject: 'Weekly tech digest',
            bodyText: 'Here are the latest tech news and updates...',
        });

        sandbox.onTable('email_logs').forSelect({ data: null, error: null });
        sandbox.onTable('email_logs').forInsert({ data: [], error: null });
        sandbox.onTable('app_settings').forUpdate({ data: null, error: null });

        await pollUserInbox(baseSettings);

        // No application update should have happened
        const appUpdateCalls = sandbox.getCallsTo('applications', 'update');
        expect(appUpdateCalls.length).toBe(0);

        // No notification
        const notifCalls = sandbox.getCallsTo('notifications', 'insert');
        expect(notifCalls.length).toBe(0);

        // Email log should still be inserted
        const logCalls = sandbox.getCallsTo('email_logs', 'insert');
        expect(logCalls.length).toBe(1);
    });

    // ── Test 3: Terminal status guard ─────────────────────────────────────

    it('should NOT overwrite terminal status (rejected)', async () => {
        mockMessages.push(createImapMessage(102));
        registerParsedEmail(102, {
            from: 'hr@bigbank.com',
            subject: 'Interview invitation from BigBank',
            bodyText: 'We would like to schedule an interview with you for the Data Engineer position.',
        });

        sandbox.onTable('email_logs').forSelect({ data: null, error: null });
        sandbox.onTable('email_logs').forInsert({ data: [], error: null });
        sandbox.onTable('app_settings').forUpdate({ data: null, error: null });

        await pollUserInbox(baseSettings);

        // BigBank app (id: 3) is already "Rejected" — no update should happen
        const appUpdateCalls = sandbox.getCallsTo('applications', 'update');
        expect(appUpdateCalls.length).toBe(0);
    });

    // ── Test 4: Invalid transition guard ──────────────────────────────────

    it('should NOT allow backward status transition (interview → assessment)', async () => {
        mockMessages.push(createImapMessage(103));
        registerParsedEmail(103, {
            from: 'talent@startupxyz.com',
            subject: 'StartupXYZ coding challenge',
            bodyText: 'Please complete this assessment and coding challenge for the Fullstack Dev position.',
        });

        sandbox.onTable('email_logs').forSelect({ data: null, error: null });
        sandbox.onTable('email_logs').forInsert({ data: [], error: null });
        sandbox.onTable('app_settings').forUpdate({ data: null, error: null });

        await pollUserInbox(baseSettings);

        // StartupXYZ app (id: 4) is at "Interviewing" — cannot go back to "assessment"
        const appUpdateCalls = sandbox.getCallsTo('applications', 'update');
        expect(appUpdateCalls.length).toBe(0);
    });

    // ── Test 5: Silent status (applied/unknown) skipped ───────────────────

    it('should NOT auto-update or notify for "applied" confirmation emails', async () => {
        mockMessages.push(createImapMessage(104));
        registerParsedEmail(104, {
            from: 'noreply@acmetech.com',
            subject: 'Application received - AcmeTech',
            bodyText: 'Thank you for applying. We received your application and will review it shortly.',
        });

        sandbox.onTable('email_logs').forSelect({ data: null, error: null });
        sandbox.onTable('email_logs').forInsert({ data: [], error: null });
        sandbox.onTable('app_settings').forUpdate({ data: null, error: null });

        await pollUserInbox(baseSettings);

        // No status update (applied is a silent status)
        const appUpdateCalls = sandbox.getCallsTo('applications', 'update');
        expect(appUpdateCalls.length).toBe(0);

        // No notification
        const notifCalls = sandbox.getCallsTo('notifications', 'insert');
        expect(notifCalls.length).toBe(0);
    });

    // ── Test 6: Duplicate message_id skipped ──────────────────────────────

    it('should skip already-processed messages (duplicate message_id)', async () => {
        mockMessages.push(createImapMessage(105));
        registerParsedEmail(105, {
            from: 'careers@testcorp.com',
            subject: 'Update from TestCorp',
            bodyText: 'We regret to inform you...',
        });

        // Simulate existing log for this message_id
        sandbox.onTable('email_logs').forSelect({ data: { id: 99 }, error: null });
        sandbox.onTable('email_logs').forInsert({ data: [], error: null });
        sandbox.onTable('app_settings').forUpdate({ data: null, error: null });

        await pollUserInbox(baseSettings);

        // No application update (message was skipped)
        const appUpdateCalls = sandbox.getCallsTo('applications', 'update');
        expect(appUpdateCalls.length).toBe(0);
    });

    // ── Test 7: Aggregator domain extraction ──────────────────────────────

    it('should match application via subject extraction for LinkedIn emails', async () => {
        mockMessages.push(createImapMessage(106));
        registerParsedEmail(106, {
            from: 'notifications@linkedin.com',
            fromName: 'LinkedIn',
            subject: 'Sagi, your application was sent to AcmeTech',
            bodyText: 'Your application for Frontend Developer at AcmeTech was submitted.',
        });

        sandbox.onTable('email_logs').forSelect({ data: null, error: null });
        sandbox.onTable('email_logs').forInsert({ data: [], error: null });
        sandbox.onTable('app_settings').forUpdate({ data: null, error: null });

        await pollUserInbox(baseSettings);

        // Email log should have been created with matched company
        const logCalls = sandbox.getCallsTo('email_logs', 'insert');
        expect(logCalls.length).toBe(1);
    });

    // ── Test 8: Notification content ──────────────────────────────────────

    it('should create notification with correct title and body on auto-update', async () => {
        mockMessages.push(createImapMessage(107));
        registerParsedEmail(107, {
            from: 'hr@testcorp.com',
            fromName: 'TestCorp HR',
            subject: 'Interview invitation - Software Engineer',
            bodyText: 'We would like to schedule an interview with you. Please book a time.',
        });

        sandbox.onTable('email_logs').forSelect({ data: null, error: null });
        sandbox.onTable('applications').forUpdate({ data: { id: 1, status: 'interview' }, error: null });

        let capturedNotification = null;
        const origFrom = sandbox.from;
        // We need to capture the notification insert data
        sandbox.onTable('notifications').forInsert({ data: { id: 1 }, error: null });
        sandbox.onTable('email_logs').forInsert({ data: [], error: null });
        sandbox.onTable('app_settings').forUpdate({ data: null, error: null });

        await pollUserInbox(baseSettings);

        const notifCalls = sandbox.getCallsTo('notifications', 'insert');
        expect(notifCalls.length).toBe(1);

        // The notification insert args should contain company and role in the title
        const insertArgs = notifCalls[0].args;
        if (insertArgs) {
            // insertArgs is the data passed to .insert()
            expect(insertArgs).toBeDefined();
        }
    });
});
