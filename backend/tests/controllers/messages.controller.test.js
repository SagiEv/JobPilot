'use strict';

jest.mock('../../services/settings.service');
jest.mock('../../repositories/profile.repository');
jest.mock('../../repositories/skills.repository');
jest.mock('../../repositories/experience.repository');
jest.mock('axios');
jest.mock('pdf-parse', () => jest.fn().mockResolvedValue({ text: 'CV text from PDF' }));

const settingsService = require('../../services/settings.service');
const profileRepository = require('../../repositories/profile.repository');
const skillsRepository = require('../../repositories/skills.repository');
const experienceRepository = require('../../repositories/experience.repository');
const axios = require('axios');
const controller = require('../../controllers/messages.controller');
const { buildReqRes } = require('../helpers/factories');

describe('messages.controller', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('generateMessage', () => {
        it('should return 400 when no AI key configured', async () => {
            const { req, res } = buildReqRes({
                body: { purpose: 'referral', description: 'Test role' },
            });
            settingsService.getAllAiConfigs.mockResolvedValue({
                ai_routing: { mailCreator: { provider: 'groq' } },
                // groq_token is missing
            });

            await controller.generateMessage(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ error: expect.stringContaining('API key') })
            );
        });

        it('should return generated message on success', async () => {
            const { req, res } = buildReqRes({
                body: { purpose: 'referral', description: 'SWE at Google' },
            });
            settingsService.getAllAiConfigs.mockResolvedValue({
                groq_token: 'gsk_test',
                ai_routing: { mailCreator: { provider: 'groq' } },
            });
            profileRepository.findFirstProfile.mockResolvedValue({ data: { cv: 'cv text' } });
            skillsRepository.findAll.mockResolvedValue({ data: [] });
            experienceRepository.findAllProjects.mockResolvedValue({ data: [] });
            experienceRepository.findExperienceText.mockResolvedValue({ data: { text: '' } });
            axios.post.mockResolvedValue({ data: { message: 'Hello recruiter...' } });

            await controller.generateMessage(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Hello recruiter...',
            });
        });

        it('should return 500 on AI service failure', async () => {
            const { req, res } = buildReqRes({
                body: { purpose: 'referral', description: 'test' },
            });
            settingsService.getAllAiConfigs.mockResolvedValue({
                groq_token: 'gsk_test',
                ai_routing: { mailCreator: { provider: 'groq' } },
            });
            profileRepository.findFirstProfile.mockResolvedValue({ data: {} });
            skillsRepository.findAll.mockResolvedValue({ data: [] });
            experienceRepository.findAllProjects.mockResolvedValue({ data: [] });
            experienceRepository.findExperienceText.mockResolvedValue({ data: {} });
            axios.post.mockRejectedValue(new Error('Connection refused'));

            await controller.generateMessage(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
