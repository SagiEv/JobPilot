const applicationService = require('../services/applications.service');
const fitAnalysisService = require('../services/fitAnalysis.service');
const AppError = require('../utils/AppError');

const getAll = async (req, res) => {
    const userId = req.user.id;
    const data = await applicationService.getAllApplications(userId, req.supabase);
    res.json(data);
};

const create = async (req, res) => {
    const userId = req.user.id;
    let applicationData = { ...req.body };

    // Calculate deterministic fit synchronously if JD is provided
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

    // Trigger async AI fit analysis in the background (fire-and-forget)
    if (applicationData.info && applicationData.fit_score_deterministic !== undefined) {
        fitAnalysisService.triggerAsyncAiAnalysis(userId, data.id, applicationData.info, req.supabase);
    }

    res.json(data);
};

const update = async (req, res) => {
    const userId = req.user.id;
    try {
        const data = await applicationService.updateApplication(userId, req.params.id, req.body, req.supabase);
        res.json(data);
    } catch (error) {
        if (error.code === 'CONFLICTING_EVENT') {
            return res.status(409).json({ error: error.message, code: error.code, conflictData: error.conflictData });
        }
        throw error; // Re-throw for asyncHandler to catch
    }
};

const remove = async (req, res) => {
    const userId = req.user.id;
    const result = await applicationService.deleteApplication(userId, req.params.id, req.supabase);
    res.json(result);
};

const bulkCreate = async (req, res) => {
    const userId = req.user.id;
    const result = await applicationService.bulkCreateApplications(userId, req.body.applications, req.supabase);
    res.json(result);
};

const getAnalyticsMetrics = async (req, res) => {
    const userId = req.user.id;
    const result = await applicationService.getAnalyticsMetrics(userId, req.supabase);
    res.json(result);
};

const getDailyStats = async (req, res) => {
    const userId = req.user.id;
    const { start, end } = req.query;
    if (!start || !end) {
        throw new AppError("Missing start or end query parameters", 400);
    }
    const stats = await applicationService.getDailyStats(userId, start, end, req.supabase);
    res.json(stats);
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