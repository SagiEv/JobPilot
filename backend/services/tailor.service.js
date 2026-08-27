const profileRepository = require('../repositories/profile.repository');
const skillsRepository = require('../repositories/skills.repository');
const experienceRepository = require('../repositories/experience.repository');
const settingsService = require('./settings.service');
const pdfParse = require('pdf-parse');

const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

const runTailoring = async (userId, jobDescription, mode = 'full', useProfile = true, cvFile = null, token = null) => {

    // 1. Get AI configs
    const aiConfigs = await settingsService.getAllAiConfigs(userId, token);
    const routing = aiConfigs?.ai_routing?.cvTailoring || { provider: 'groq', model: null };
    
    // Validate provider token
    const tokenKey = `${routing.provider}_token`;
    if (!aiConfigs || !aiConfigs[tokenKey]) {
        throw new Error(`API key for ${routing.provider} is not configured. Please add it in Settings.`);
    }

    // 2. Fetch context based on user choice
    let profile = null;
    let baseCvText = "";
    let cvData = {};

    if (useProfile) {
        const result = await profileRepository.findFirstProfile(userId);
        profile = result?.data;
        baseCvText = profile?.cv || "";
        if (baseCvText.toLowerCase().endsWith('.pdf') || baseCvText.toLowerCase().endsWith('.docx')) {
            baseCvText = "";
        }
        cvData = profile?.cv_data || {};
    } else if (cvFile) {
        try {
            const pdfData = await pdfParse(cvFile.buffer);
            baseCvText = pdfData.text;
        } catch (err) {
            console.error("Failed to parse PDF:", err);
            throw new Error("Failed to parse uploaded PDF file. Please ensure it is a valid PDF.");
        }
    } else {
        throw new Error("No CV provided. Please use profile CV or upload a PDF.");
    }

    const { data: skills } = await skillsRepository.findAll(userId);
    const { data: projects } = await experienceRepository.findAllProjects(userId);
    const { data: experienceText } = await experienceRepository.findExperienceText(userId);

    // 3. Assemble payload
    const payload = {
        job_description: jobDescription,
        api_keys: {
            groq_token: aiConfigs.groq_token,
            openai_token: aiConfigs.openai_token,
            claude_token: aiConfigs.claude_token,
            gemini_token: aiConfigs.gemini_token
        },
        provider: routing.provider,
        model: routing.model,
        base_cv: baseCvText,
        cv_data: cvData,
        skills_pool: skills || [],
        projects_pool: projects || [],
        experience_text: experienceText?.text || "",
        mode: mode
    };

    // 4. Send to Python Microservice
    try {
        const response = await axios.post(`${AI_SERVICE_URL}/tailor`, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 120000 // Pipeline might take up to 2 minutes
        });
        return response.data;
    } catch (error) {
        console.error('AI Service Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.detail || 'Failed to connect to AI tailoring service. Is it running?');
    }
};

module.exports = { runTailoring };
