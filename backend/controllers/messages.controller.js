const axios = require('axios');
const pdfParse = require('pdf-parse');
const { supabase } = require('../supabaseClient');
const profileRepository = require('../repositories/profile.repository');
const skillsRepository = require('../repositories/skills.repository');
const experienceRepository = require('../repositories/experience.repository');

exports.generateMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { purpose, jobLink, description, addresseeName, githubPortfolio, recipientEmail, language } = req.body;
        const cvFile = req.file;

        // Fetch user's groq_api_key from settings
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('groq_api_key')
            .eq('user_id', userId)
            .single();

        if (settingsError || !settings?.groq_api_key) {
            return res.status(400).json({ error: 'Groq API Key is missing in your settings.' });
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
            groq_api_key: settings.groq_api_key
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
