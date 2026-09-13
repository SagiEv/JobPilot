const applicationService = require('../services/applications.service');
const rssService = require('../services/rss.service');
const fitAnalysisService = require('../services/fitAnalysis.service');
const settingsService = require('../services/settings.service');
const axios = require('axios');

const getAll = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized: User not found" });
        }
        const userId = req.user.id;
        const data = await applicationService.getAllApplications(userId, req.supabase);

        console.log("getAllApplications: data", data);

        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const create = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized: User not found" });
        }
        const userId = req.user.id;
        
        let applicationData = { ...req.body };

        // 1. Calculate deterministic fit synchronously if JD is provided
        if (applicationData.info) {
            try {
                const { candidateData } = await fitAnalysisService.getFitContext(userId, req.supabase);
                const scoreData = fitAnalysisService.calculateDeterministicFit(candidateData, applicationData.info);
                applicationData.fit_score_deterministic = scoreData.score;
            } catch (err) {
                console.error("Error calculating deterministic fit:", err);
            }
        }

        const data = await applicationService.createApplication(userId, applicationData, req.supabase);
        
        // Trigger AI correctly now that we have the app ID
        if (applicationData.info && applicationData.fit_score_deterministic !== undefined) {
             fitAnalysisService.getFitContext(userId, req.supabase)
             .then(async ({ candidateData, fitConfig }) => {
                 if (fitConfig.enabled !== false && fitConfig.provider) {
                     const aiProvider = fitConfig.provider;
                     
                     // Fetch user's decrypted API keys from DB
                     const aiConfigs = await settingsService.getAllAiConfigs(userId, req.supabase);
                     
                     // Ensure we have an API key for the chosen provider before firing
                     let token = null;
                     if (aiProvider === 'groq') token = aiConfigs?.groq_token;
                     else if (aiProvider === 'openai') token = aiConfigs?.openai_token;
                     else if (aiProvider === 'anthropic' || aiProvider === 'claude') token = aiConfigs?.claude_token;
                     else if (aiProvider === 'gemini') token = aiConfigs?.gemini_token;

                     if (!token) {
                         console.warn(`Skipping AI Fit Analysis: No API key configured by user for provider '${aiProvider}'.`);
                         return;
                     }

                     // We don't await this, let it run in the background
                     axios.post(`${process.env.AI_SERVICE_URL}/role-fit/analyze`, {
                         job_description: applicationData.info,
                         candidate_data: candidateData,
                         api_keys: {
                             groq_token: aiConfigs?.groq_token,
                             openai_token: aiConfigs?.openai_token,
                             claude_token: aiConfigs?.claude_token,
                             gemini_token: aiConfigs?.gemini_token
                         },
                         provider: aiProvider
                     }).then(async (response) => {
                         if (response.data) {
                             await req.supabase.from('applications').update({ fit_analysis_ai: response.data }).eq('id', data.id).eq('user_id', userId);
                         }
                     }).catch(err => console.error('AI Fit Analysis failed:', err.message));
                 }
             }).catch(err => console.error("Error triggering AI:", err));
        }

        res.json(data);
    } catch (error) {
        console.error("POST /api/applications error:", error);
        res.status(400).json({ error: error.message });
    }
};

const update = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized: User not found" });
        }
        const userId = req.user.id;
        const data = await applicationService.updateApplication(userId, req.params.id, req.body, req.supabase);
        res.json(data);
    } catch (error) {
        if (error.code === 'CONFLICTING_EVENT') {
            return res.status(409).json({ error: error.message, code: error.code, conflictData: error.conflictData });
        }
        res.status(400).json({ error: error.message });
    }
};

const remove = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await applicationService.deleteApplication(userId, req.params.id, req.supabase);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const bulkCreate = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await applicationService.bulkCreateApplications(userId, req.body.applications, req.supabase);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message, details: error.details });
    }
};

const getAnalyticsMetrics = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await applicationService.getAnalyticsMetrics(userId, req.supabase);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getDailyStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const { start, end } = req.query;
        if (!start || !end) return res.status(400).json({ error: "Missing start or end query parameters" });
        const stats = await applicationService.getDailyStats(userId, start, end, req.supabase);
        res.json(stats);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getAll,
    create,
    update,
    remove,
    bulkCreate,
    getAnalyticsMetrics,
    getDailyStats
};