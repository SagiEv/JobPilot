'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Tailor Proxy Integration Tests
//
// Tests the Node.js → FastAPI proxy chain for CV tailoring.
// Axios calls to the AI service are mocked by default.
//
// Optional live mode: set LIVE_AI_SERVICE=true to hit the real FastAPI server.
// ─────────────────────────────────────────────────────────────────────────────

const request = require('supertest');
const app = require('../../server');
const { sandbox } = require('./setup.integration');
const { buildUser } = require('../helpers/factories');

const IS_LIVE = process.env.LIVE_AI_SERVICE === 'true';

// Mock axios for AI service calls (unless LIVE_AI_SERVICE is set)
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

// Mock pdf-parse (used when uploading CV file)
jest.mock('pdf-parse', () => jest.fn().mockResolvedValue({ text: 'Parsed CV text content' }));

describe('Integration: Tailor Proxy (Node.js ↔ FastAPI)', () => {
    const user = buildUser();
    const AUTH_HEADER = 'Bearer mock-integration-token';

    beforeEach(() => {
        jest.clearAllMocks();
        sandbox.reset();
        sandbox.setAuthUser(user);
        if (mockAxios) {
            mockAxios.post.mockReset();
        }
    });

    // ── Test 1: Creates background job and returns 202 ────────────────────

    it('should create a background job and return 202 with jobId', async () => {
        const jobId = 'job-uuid-001';

        // settingsService.getSettings → app_settings select
        sandbox.onTable('app_settings').forSelect({
            data: {
                groq_token_encrypted: 'encrypted_groq_key',
                openai_token_encrypted: null,
                claude_token_encrypted: null,
                gemini_token_encrypted: null,
                ai_routing: { cvTailoring: { provider: 'groq', model: null } },
            },
            error: null,
        });

        // jobService.createJob → ai_jobs insert
        sandbox.onTable('ai_jobs').forInsert({ data: { id: jobId }, error: null });

        // Profile fetch for tailor service
        sandbox.onTable('profile').forSelect({
            data: { cv: 'My CV text', cv_data: {} },
            error: null,
        });

        // Experience text fetch
        sandbox.onTable('experience_text').forSelect({
            data: { text: 'My experience' },
            error: null,
        });

        // Skills / Projects vector search via RPC
        sandbox.onRpc('match_projects', { data: [], error: null });
        sandbox.onRpc('match_skills', { data: [], error: null });

        // Mock embedding service
        jest.mock('../../services/embedding.service', () => ({
            getEmbedding: jest.fn().mockResolvedValue(null),
        }));

        // Experience projects fallback
        sandbox.onTable('projects').forSelect({ data: [], error: null });
        sandbox.onTable('skills').forSelect({ data: [], error: null });

        if (mockAxios) {
            mockAxios.post.mockResolvedValue({
                data: { tailored_cv_markdown: '# Tailored CV', report: {} },
            });
        }

        // Job completion update
        sandbox.onTable('ai_jobs').forUpdate({ data: null, error: null });

        const res = await request(app)
            .post('/api/tailor')
            .set('Authorization', AUTH_HEADER)
            .send({
                job_description: 'Senior React Developer at TechCorp',
                mode: 'full',
                use_profile_cv: true,
            })
            .expect(202);

        expect(res.body).toHaveProperty('jobId');
        expect(res.body).toHaveProperty('status', 'pending');

        // Verify job was created in ai_jobs table
        const jobInserts = sandbox.getCallsTo('ai_jobs', 'insert');
        expect(jobInserts.length).toBe(1);
    });

    // ── Test 2: Successful tailoring completes job ────────────────────────

    it('should complete job with result_data after successful AI response', async () => {
        if (IS_LIVE) {
            console.log('⏭ Skipping mock-only test in live mode');
            return;
        }

        const tailorService = require('../../services/tailor.service');
        const jobService = require('../../services/job.service');

        // Mock jobService
        jest.spyOn(jobService, 'completeJob').mockResolvedValue(undefined);
        jest.spyOn(jobService, 'failJob').mockResolvedValue(undefined);

        // Mock settings
        const settingsService = require('../../services/settings.service');
        jest.spyOn(settingsService, 'getAllAiConfigs').mockResolvedValue({
            groq_token: 'test-groq-key',
            ai_routing: { cvTailoring: { provider: 'groq', model: null } },
        });

        // Mock profile repo
        const profileRepo = require('../../repositories/profile.repository');
        jest.spyOn(profileRepo, 'findFirstProfile').mockResolvedValue({
            data: { cv: 'Base CV text', cv_data: {} },
        });

        // Mock experience
        const expRepo = require('../../repositories/experience.repository');
        jest.spyOn(expRepo, 'findExperienceText').mockResolvedValue({ data: { text: 'Experience text' } });
        jest.spyOn(expRepo, 'findAllProjects').mockResolvedValue({ data: [] });

        // Mock skills
        const skillsRepo = require('../../repositories/skills.repository');
        jest.spyOn(skillsRepo, 'findAll').mockResolvedValue({ data: [] });

        // Mock embedding
        jest.mock('../../services/embedding.service', () => ({
            getEmbedding: jest.fn().mockResolvedValue(null),
        }));

        mockAxios.post.mockResolvedValue({
            data: { tailored_cv_markdown: '# Tailored', report: { score: 8 } },
        });

        await tailorService.runTailoringAsync(
            user.id, 'job-123', 'React Developer at TechCorp', 'full', true, null, 'mock-token'
        );

        expect(jobService.completeJob).toHaveBeenCalledWith('job-123', expect.objectContaining({
            tailored_cv_markdown: '# Tailored',
        }));
        expect(jobService.failJob).not.toHaveBeenCalled();
    });

    // ── Test 3: Failed tailoring marks job failed ─────────────────────────

    it('should mark job as failed when AI service returns error', async () => {
        if (IS_LIVE) return;

        const tailorService = require('../../services/tailor.service');
        const jobService = require('../../services/job.service');

        jest.spyOn(jobService, 'completeJob').mockResolvedValue(undefined);
        jest.spyOn(jobService, 'failJob').mockResolvedValue(undefined);

        const settingsService = require('../../services/settings.service');
        jest.spyOn(settingsService, 'getAllAiConfigs').mockResolvedValue({
            groq_token: 'test-groq-key',
            ai_routing: { cvTailoring: { provider: 'groq', model: null } },
        });

        const profileRepo = require('../../repositories/profile.repository');
        jest.spyOn(profileRepo, 'findFirstProfile').mockResolvedValue({
            data: { cv: 'CV text', cv_data: {} },
        });

        const expRepo = require('../../repositories/experience.repository');
        jest.spyOn(expRepo, 'findExperienceText').mockResolvedValue({ data: { text: '' } });
        jest.spyOn(expRepo, 'findAllProjects').mockResolvedValue({ data: [] });

        const skillsRepo = require('../../repositories/skills.repository');
        jest.spyOn(skillsRepo, 'findAll').mockResolvedValue({ data: [] });

        mockAxios.post.mockRejectedValue({
            response: { data: { detail: 'LLM rate limit exceeded' } },
            message: 'Request failed',
        });

        await tailorService.runTailoringAsync(
            user.id, 'job-456', 'Engineer at Company', 'full', true, null, 'mock-token'
        );

        expect(jobService.failJob).toHaveBeenCalledWith('job-456', expect.anything());
        expect(jobService.completeJob).not.toHaveBeenCalled();
    });

    // ── Test 4: Missing API key returns clear error ───────────────────────

    it('should throw clear error when API key is missing for the provider', async () => {
        const tailorService = require('../../services/tailor.service');

        const settingsService = require('../../services/settings.service');
        jest.spyOn(settingsService, 'getAllAiConfigs').mockResolvedValue({
            groq_token: null, // Missing!
            ai_routing: { cvTailoring: { provider: 'groq', model: null } },
        });

        await expect(
            tailorService.runTailoring(user.id, 'Test job description', 'full', true, null, 'mock-token')
        ).rejects.toThrow(/groq.*not configured/i);
    });

    // ── Test 5: Payload assembly ──────────────────────────────────────────

    it('should assemble correct payload when calling FastAPI', async () => {
        if (IS_LIVE) return;

        const tailorService = require('../../services/tailor.service');

        const settingsService = require('../../services/settings.service');
        jest.spyOn(settingsService, 'getAllAiConfigs').mockResolvedValue({
            groq_token: 'test-key',
            openai_token: null,
            claude_token: null,
            gemini_token: null,
            ai_routing: { cvTailoring: { provider: 'groq', model: 'llama3' } },
        });

        const profileRepo = require('../../repositories/profile.repository');
        jest.spyOn(profileRepo, 'findFirstProfile').mockResolvedValue({
            data: { cv: 'My CV', cv_data: { summary: 'Engineer' } },
        });

        const expRepo = require('../../repositories/experience.repository');
        jest.spyOn(expRepo, 'findExperienceText').mockResolvedValue({ data: { text: '4 years exp' } });
        jest.spyOn(expRepo, 'findAllProjects').mockResolvedValue({
            data: [{ title: 'Project A', description: 'Desc', tech_stack: 'React' }],
        });

        const skillsRepo = require('../../repositories/skills.repository');
        jest.spyOn(skillsRepo, 'findAll').mockResolvedValue({
            data: [{ name: 'React', level: 'Advanced', category: 'Frontend' }],
        });

        mockAxios.post.mockResolvedValue({ data: { tailored_cv_markdown: '# CV' } });

        await tailorService.runTailoring(user.id, 'React Developer at TechCorp', 'full', true, null, 'mock-token');

        expect(mockAxios.post).toHaveBeenCalledWith(
            expect.stringContaining('/tailor'),
            expect.objectContaining({
                job_description: expect.any(String),
                api_keys: expect.objectContaining({ groq_token: 'test-key' }),
                provider: 'groq',
                model: 'llama3',
                base_cv: expect.any(String),
                skills_pool: expect.any(Array),
                projects_pool: expect.any(Array),
                experience_text: expect.any(String),
            }),
            expect.any(Object)
        );
    });

    // ── Test 6: Job status polling ────────────────────────────────────────

    it('should return job status and block access to other users jobs', async () => {
        // GET /api/tailor/jobs/:id — own job
        sandbox.onTable('ai_jobs').forSelect({
            data: { id: 'job-789', user_id: user.id, status: 'completed', result_data: {} },
            error: null,
        });

        const res = await request(app)
            .get('/api/tailor/jobs/job-789')
            .set('Authorization', AUTH_HEADER)
            .expect(200);

        expect(res.body).toHaveProperty('status', 'completed');

        // GET /api/tailor/jobs/:id — another user's job → 403
        sandbox.onTable('ai_jobs').forSelect({
            data: { id: 'job-other', user_id: 'different-user-id', status: 'completed' },
            error: null,
        });

        await request(app)
            .get('/api/tailor/jobs/job-other')
            .set('Authorization', AUTH_HEADER)
            .expect(403);
    });
});
