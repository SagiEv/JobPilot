const axios = require('axios');
const pdfParse = require('pdf-parse');
const { supabase } = require('../supabaseClient');

exports.generateMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { purpose, jobLink, description, addresseeName, githubPortfolio } = req.body;
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

        // Call Python service
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001';
        
        const response = await axios.post(`${aiServiceUrl}/generate-message`, {
            purpose: purpose || 'referral',
            job_link: jobLink || '',
            description: description || '',
            addressee_name: addresseeName || '',
            cv_text: cvText,
            github_portfolio: githubPortfolio || '',
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
