'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Integration Test Setup
//
// This file is loaded by Jest before integration tests run.
// It configures environment variables, stubs cron jobs, and sets up the
// Supabase sandbox that individual test files can configure.
// ─────────────────────────────────────────────────────────────────────────────

// ── Stub environment ─────────────────────────────────────────────────────────
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'dummy_anon_key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_service_key';
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'dummy_groq_key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dummy_jwt_secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
process.env.AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
process.env.NODE_ENV = 'test';

// ── Prevent cron jobs from auto-starting ─────────────────────────────────────
jest.mock('../../cron/mail-poll-cron', () => ({
    startMailPolling: jest.fn(),
    stopMailPolling: jest.fn(),
}));

jest.mock('../../cron/rss-poll-cron', () => ({
    startRssPolling: jest.fn(),
    stopRssPolling: jest.fn(),
}));

// ── Mock ESM-only packages that Jest can't parse ─────────────────────────────
jest.mock('puppeteer', () => ({
    launch: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
            goto: jest.fn(), setContent: jest.fn(), pdf: jest.fn().mockResolvedValue(Buffer.from('')),
            close: jest.fn(),
        }),
        close: jest.fn(),
    }),
}));

jest.mock('googleapis', () => ({
    google: {
        auth: { OAuth2: jest.fn().mockImplementation(() => ({
            generateAuthUrl: jest.fn(), getToken: jest.fn(), setCredentials: jest.fn(),
        }))},
        gmail: jest.fn(() => ({ users: { getProfile: jest.fn() } })),
    },
}));

// ── Global Supabase mock (sandbox is injected per-test) ──────────────────────
// Variable MUST be prefixed with 'mock' for Jest to allow it in jest.mock() factory.
const { createSandbox } = require('./helpers/supabaseSandbox');
const mockSandbox = createSandbox();

jest.mock('../../supabaseClient', () => mockSandbox);

// ── Silence console logs unless debugging ────────────────────────────────────
if (process.env.DEBUG_TESTS !== 'true') {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
}

// ── Export the sandbox so tests can import it ────────────────────────────────
module.exports = { sandbox: mockSandbox };

