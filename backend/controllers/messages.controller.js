const axios = require('axios');
const pdfParse = require('pdf-parse');
const { supabase } = require('../supabaseClient');
const profileRepository = require('../repositories/profile.repository');
const skillsRepository = require('../repositories/skills.repository');
const experienceRepository = require('../repositories/experience.repository');

const settingsService = require('../services/settings.service');

exports.generateMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { purpose, jobLink, description, addresseeName, githubPortfolio, recipientEmail, language } = req.body;
        const cvFile = req.file;

        const aiConfigs = await settingsService.getAllAiConfigs(userId, req.token);
        const routingProvider = aiConfigs?.ai_routing?.mailCreator?.provider || 'groq';
        const routingModel = aiConfigs?.ai_routing?.mailCreator?.model || null;

        const tokenKey = `${routingProvider}_token`;
        if (!aiConfigs || !aiConfigs[tokenKey]) {
            return res.status(400).json({ error: `API key for ${routingProvider} is not configured. Please add it in Settings.` });
        }

        let cvText = '';
        if (cvFile && cvFile.mimetype === 'application/pdf') {
            const pdfData = await pdfParse(cvFile.buffer);
            cvText = pdfData.text;
        }

        const profileResult = await profileRepository.findFirstProfile(userId);
        const { data: skills } = await skillsRepository.findAll(userId);
        const { data: projects } = await experienceRepository.findAllProjects(userId);
        const { data: experienceText } = await experienceRepository.findExperienceText(userId);

        // Call Python service
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001';
        
        const response = await axios.post(`${aiServiceUrl}/generate-message`, {
            purpose: purpose || 'referral',
            job_link: jobLink || '',
            description: description || '',
            addressee_name: addresseeName || '',
            cv_text: cvText || profileResult?.data?.cv || '',
            github_portfolio: githubPortfolio || '',
            recipient_email: recipientEmail || '',
            language: language || 'En',
            skills_pool: skills || [],
            projects_pool: projects || [],
            experience_text: experienceText?.text || '',
            api_keys: {
                groq_token: aiConfigs.groq_token,
                openai_token: aiConfigs.openai_token,
                claude_token: aiConfigs.claude_token,
                gemini_token: aiConfigs.gemini_token
            },
            provider: routingProvider,
            model: routingModel
        });

        res.json({
            success: true,
            message: response.data.message
        });

    } catch (err) {
        console.error('Error generating message:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to generate message' });
    }
};
