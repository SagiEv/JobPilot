'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// RSS AI Pipeline Integration Tests
//
// Tests the RSS poller → AI classification → DB save chain.
// Both rss-parser and axios (AI service) are mocked by default.
//
// Optional live mode: set LIVE_AI_SERVICE=true to hit the real FastAPI server.
// ─────────────────────────────────────────────────────────────────────────────

const { sandbox } = require('./setup.integration');

const IS_LIVE = process.env.LIVE_AI_SERVICE === 'true';

// Mock rss-parser
const mockFeedItems = [];
jest.mock('rss-parser', () => {
    return jest.fn().mockImplementation(() => ({
        parseURL: jest.fn().mockResolvedValue({
            title: 'Test Feed',
            items: mockFeedItems,
        }),
    }));
});

// Mock axios (AI classification endpoint) unless live
jest.mock('axios', () => {
    if (process.env.LIVE_AI_SERVICE === 'true') {
        return jest.requireActual('axios');
    }
    return {
        post: jest.fn(),
        get: jest.fn(),
    };
});
const mockAxios = require('axios');

const { pollRssFeeds } = require('../../services/rssPoller');

describe('Integration: RSS → AI Classification Pipeline', () => {
    beforeEach(() => {
        sandbox.reset();
        mockFeedItems.length = 0;
        jest.clearAllMocks();
        if (mockAxios) {
            mockAxios.post.mockReset();
        }
    });

    // ── Test 1: Relevant job saved ────────────────────────────────────────

    it('should save job when AI classifies it as relevant', async () => {
        // Setup enabled feed
        sandbox.onTable('rss_feeds').forSelect({
            data: [{ id: 1, url: 'https://test.rss/feed', enabled: true }],
            error: null,
        });

        // Feed items
        mockFeedItems.push({
            title: 'Software Engineer - Google',
            link: 'https://jobs.google.com/123',
            contentSnippet: 'Join our engineering team...',
            pubDate: new Date().toISOString(),
        });

        // Dedup check: no existing job
        sandbox.onTable('rss_jobs').forSelect({ data: null, error: null });

        // App settings for groq_token
        sandbox.onTable('app_settings').forSelect({
            data: { groq_token: 'test-groq-key' },
            error: null,
        });

        if (mockAxios) {
            mockAxios.post.mockResolvedValue({
                data: { is_relevant: true, category: 'Software Engineering', seniority: 'Mid' },
            });
        }

        // Save job
        sandbox.onTable('rss_jobs').forInsert({ data: { id: 1 }, error: null });

        await pollRssFeeds();

        const jobInserts = sandbox.getCallsTo('rss_jobs', 'insert');
        expect(jobInserts.length).toBe(1);
    });

    // ── Test 2: Irrelevant job rejected ───────────────────────────────────

    it('should NOT save job when AI classifies it as irrelevant', async () => {
        sandbox.onTable('rss_feeds').forSelect({
            data: [{ id: 1, url: 'https://test.rss/feed', enabled: true }],
            error: null,
        });

        mockFeedItems.push({
            title: 'Marketing Manager - SomeCorp',
            link: 'https://somecorp.com/marketing-job',
            contentSnippet: 'Lead our marketing efforts...',
            pubDate: new Date().toISOString(),
        });

        sandbox.onTable('rss_jobs').forSelect({ data: null, error: null });
        sandbox.onTable('app_settings').forSelect({
            data: { groq_token: 'test-key' },
            error: null,
        });

        if (mockAxios) {
            mockAxios.post.mockResolvedValue({
                data: { is_relevant: false },
            });
        }

        await pollRssFeeds();

        const jobInserts = sandbox.getCallsTo('rss_jobs', 'insert');
        expect(jobInserts.length).toBe(0);
    });

    // ── Test 3: Duplicate URL skipped ─────────────────────────────────────

    it('should skip jobs whose URL already exists in rss_jobs', async () => {
        sandbox.onTable('rss_feeds').forSelect({
            data: [{ id: 1, url: 'https://test.rss/feed', enabled: true }],
            error: null,
        });

        mockFeedItems.push({
            title: 'Duplicate Job',
            link: 'https://already-exists.com/job',
            contentSnippet: 'Old job posting',
        });

        // Dedup: existing record found
        sandbox.onTable('rss_jobs').forSelect({ data: { id: 99 }, error: null });

        await pollRssFeeds();

        // No AI classification call should have been made
        if (mockAxios) {
            expect(mockAxios.post).not.toHaveBeenCalled();
        }

        // No insert
        const jobInserts = sandbox.getCallsTo('rss_jobs', 'insert');
        expect(jobInserts.length).toBe(0);
    });

    // ── Test 4: AI service failure skips gracefully ───────────────────────

    it('should skip job when AI classification fails without crashing', async () => {
        sandbox.onTable('rss_feeds').forSelect({
            data: [{ id: 1, url: 'https://test.rss/feed', enabled: true }],
            error: null,
        });

        mockFeedItems.push({
            title: 'Backend Developer - FaultyCorp',
            link: 'https://faultycorp.com/job',
            contentSnippet: 'Build APIs...',
            pubDate: new Date().toISOString(),
        });

        sandbox.onTable('rss_jobs').forSelect({ data: null, error: null });
        sandbox.onTable('app_settings').forSelect({
            data: { groq_token: 'test-key' },
            error: null,
        });

        if (mockAxios) {
            mockAxios.post.mockRejectedValue(new Error('AI Service unavailable'));
        }

        // Should NOT throw
        await expect(pollRssFeeds()).resolves.not.toThrow();

        // No job saved
        const jobInserts = sandbox.getCallsTo('rss_jobs', 'insert');
        expect(jobInserts.length).toBe(0);
    });

    // ── Test 5: Company extracted from title ──────────────────────────────

    it('should extract company from RSS title format "Role - Company"', async () => {
        sandbox.onTable('rss_feeds').forSelect({
            data: [{ id: 1, url: 'https://test.rss/feed', enabled: true }],
            error: null,
        });

        mockFeedItems.push({
            title: 'Senior Developer - Microsoft',
            link: 'https://microsoft.com/job/42',
            contentSnippet: 'Build cloud services...',
            pubDate: new Date().toISOString(),
        });

        sandbox.onTable('rss_jobs').forSelect({ data: null, error: null });
        sandbox.onTable('app_settings').forSelect({
            data: { groq_token: 'test-key' },
            error: null,
        });

        let capturedPayload = null;
        if (mockAxios) {
            mockAxios.post.mockImplementation(async (url, data) => {
                capturedPayload = data;
                return { data: { is_relevant: true, category: 'Engineering', seniority: 'Senior' } };
            });
        }

        sandbox.onTable('rss_jobs').forInsert({ data: { id: 1 }, error: null });

        await pollRssFeeds();

        if (capturedPayload) {
            expect(capturedPayload.company).toBe('Microsoft');
            expect(capturedPayload.title).toBe('Senior Developer');
        }

        const jobInserts = sandbox.getCallsTo('rss_jobs', 'insert');
        expect(jobInserts.length).toBe(1);
    });
});
