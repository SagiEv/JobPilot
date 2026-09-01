'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Data Factories — reusable builders for test objects
// ─────────────────────────────────────────────────────────────────────────────

const buildUser = (overrides = {}) => ({
    id: 'user-uuid-123',
    email: 'test@example.com',
    user_metadata: { role: 'user' },
    app_metadata: {},
    ...overrides,
});

const buildApplication = (overrides = {}) => ({
    id: 1,
    user_id: 'user-uuid-123',
    company: 'TestCorp',
    position: 'Software Engineer',
    status: 'Applied',
    stage: null,
    date: '2025-01-01',
    created_at: '2025-01-01T00:00:00Z',
    rejection_reason: null,
    automatic_rejection: false,
    role_id: '',
    ...overrides,
});

const buildContact = (overrides = {}) => ({
    id: 1,
    user_id: 'user-uuid-123',
    name: 'Jane Recruiter',
    email: 'jane@corp.com',
    phone: '555-0100',
    company: 'TestCorp',
    role: 'Recruiter',
    ...overrides,
});

const buildInterview = (overrides = {}) => ({
    id: 1,
    user_id: 'user-uuid-123',
    application_id: 1,
    company: 'TestCorp',
    stage: 'Technical Interview',
    date: '2025-02-01',
    keep: 'Good communication',
    improve: 'System design depth',
    ...overrides,
});

const buildEvent = (overrides = {}) => ({
    id: 1,
    user_id: 'user-uuid-123',
    title: 'Follow-up call',
    date: '2025-02-15',
    ...overrides,
});

const buildHistoryEntry = (overrides = {}) => ({
    id: 1,
    application_id: 1,
    event_type: 'Status Change',
    old_status: 'Applied',
    new_status: 'Interviewing',
    old_stage: null,
    new_stage: 'HR Screen',
    notes: '',
    with_who: '',
    interview_id: null,
    event_date: '2025-01-15T00:00:00Z',
    created_at: '2025-01-15T00:00:00Z',
    ...overrides,
});

const buildSettings = (overrides = {}) => ({
    groq_token_encrypted: null,
    groq_token: null,
    openai_token_encrypted: null,
    claude_token_encrypted: null,
    gemini_token_encrypted: null,
    ai_routing: {},
    timezone: 'Asia/Jerusalem',
    smtp_email: null,
    smtp_host: null,
    smtp_port: 993,
    smtp_enabled: false,
    smtp_poll_interval_min: 15,
    smtp_password_encrypted: null,
    smtp_last_polled_at: null,
    ...overrides,
});

const buildProject = (overrides = {}) => ({
    id: 1,
    user_id: 'user-uuid-123',
    title: 'JobPilot',
    description: 'Job tracking app',
    tech_stack: 'React, Node.js',
    ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// Express req/res mock builder
// ─────────────────────────────────────────────────────────────────────────────

const buildReqRes = (overrides = {}) => {
    const res = {
        json: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        redirect: jest.fn().mockReturnThis(),
    };

    const req = {
        user: buildUser(),
        token: 'mock-jwt-token',
        body: {},
        params: {},
        query: {},
        headers: {},
        file: null,
        method: 'GET',
        path: '/',
        originalUrl: '/',
        ...overrides,
    };

    const next = jest.fn();

    return { req, res, next };
};

module.exports = {
    buildUser,
    buildApplication,
    buildContact,
    buildInterview,
    buildEvent,
    buildHistoryEntry,
    buildSettings,
    buildProject,
    buildReqRes,
};
