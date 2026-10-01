const axios = require('axios');
const pdfParse = require('pdf-parse');
const profileRepository = require('../repositories/profile.repository');
const skillsRepository = require('../repositories/skills.repository');
const experienceRepository = require('../repositories/experience.repository');
const settingsService = require('./settings.service');
const AppError = require('../utils/AppError');

/**
 * Extract text content from a PDF buffer.
 */
const extractCvText = async (cvFile) => {
    if (!cvFile || cvFile.mimetype !== 'application/pdf') return '';
    const pdfData = await pdfParse(cvFile.buffer);
    return pdfData.text;
};

/**
 * Gather user context (profile, skills, projects, experience) for message generation.
 */
const gatherUserContext = async (userId, supabaseClient) => {
    const [profileResult, skillsResult, projectsResult, experienceResult] = await Promise.all([
        profileRepository.findFirstProfile(userId, supabaseClient),
        skillsRepository.findAll(userId, supabaseClient),
        experienceRepository.findAllProjects(userId, supabaseClient),
        experienceRepository.findExperienceText(userId, supabaseClient)
    ]);

    return {
        profile: profileResult?.data || null,
        skills: skillsResult?.data || [],
        projects: projectsResult?.data || [],
        experienceText: experienceResult?.data?.text || ''
    };
};

/**
 * Resolve AI provider and API key from user settings, throwing if unconfigured.
 */
const resolveAiProvider = (aiConfigs) => {
    const provider = aiConfigs?.ai_routing?.mailCreator?.provider || 'groq';
    const model = aiConfigs?.ai_routing?.mailCreator?.model || null;
    const tokenKey = `${provider}_token`;

    if (!aiConfigs || !aiConfigs[tokenKey]) {
        throw new AppError(
            `API key for ${provider} is not configured. Please add it in Settings.`,
            400
        );
    }

    return { provider, model };
};

/**
 * Call the AI microservice to generate a message.
 */
const callAiService = async (payload) => {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001';
    const response = await axios.post(`${aiServiceUrl}/generate-message`, payload);
    return response.data.message;
};

/**
 * Map AI service errors to user-friendly messages.
 */
const mapAiError = (err) => {
    const errorDetail = err.response?.data || err.message;
    const errorStr = JSON.stringify(errorDetail).toLowerCase();

    if (errorStr.includes('503') || errorStr.includes('unavailable') || errorStr.includes('high demand')) {
        return 'AI Provider is currently experiencing high demand. Please try again later.';
    }
    if (errorStr.includes('429') || errorStr.includes('rate limit') || errorStr.includes('quota') || errorStr.includes('token')) {
        return 'AI Provider rate limit or token quota exceeded. Please try again later or update your API key.';
    }
    return 'Failed to generate message';
};

/**
 * Orchestrate message generation: gather context, resolve AI, call service.
 */
const generateMessage = async (userId, body, cvFile, supabaseClient) => {
    const { purpose, jobLink, description, addresseeName, githubPortfolio, recipientEmail, language } = body;

    // 1. Resolve AI provider
    const aiConfigs = await settingsService.getAllAiConfigs(userId, supabaseClient);
    const { provider, model } = resolveAiProvider(aiConfigs);

    // 2. Extract CV text
    const cvText = await extractCvText(cvFile);

    // 3. Gather user context
    const context = await gatherUserContext(userId, supabaseClient);

    // 4. Call AI service
    try {
        const message = await callAiService({
            purpose: purpose || 'referral',
            job_link: jobLink || '',
            description: description || '',
            addressee_name: addresseeName || '',
            cv_text: cvText || context.profile?.cv || '',
            github_portfolio: githubPortfolio || '',
            recipient_email: recipientEmail || '',
            language: language || 'En',
            skills_pool: context.skills,
            projects_pool: context.projects,
            experience_text: context.experienceText,
            api_keys: {
                groq_token: aiConfigs.groq_token,
                openai_token: aiConfigs.openai_token,
                claude_token: aiConfigs.claude_token,
                gemini_token: aiConfigs.gemini_token
            },
            provider,
            model
        });

        return { success: true, message };
    } catch (err) {
        console.error('Error generating message:', err.response?.data || err.message);
        throw new AppError(mapAiError(err), 500);
    }
};

module.exports = { generateMessage };
