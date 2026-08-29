const interviewRepository = require('../repositories/interviews.repository');
const applicationHistoryService = require('./applicationHistory.service');

const getAllInterviews = async (userId) => {
    const { data, error } = await interviewRepository.findAll(userId);
    if (error) throw new Error(error.message);
    return data;
};

const createInterview = async (userId, data) => {
    const { data: newInterview, error } = await interviewRepository.create(userId, data);
    if (error) throw new Error(error.message);

    // If linked to an application, log the interview in application history
    if (newInterview.application_id) {
        await applicationHistoryService.logChange(
            newInterview.application_id,
            'Interview',
            null,
            null,
            null,
            null,
            `Scheduled interview: ${newInterview.stage}`,
            newInterview.company,
            newInterview.id
        );
    }

    return newInterview;
};

const updateInterview = async (userId, id, data) => {
    const { data: updatedInterview, error } = await interviewRepository.update(userId, id, data);
    if (error) throw new Error(error.message);
    return updatedInterview;
};

const axios = require('axios');

const deleteInterview = async (userId, id) => {
    const { error } = await interviewRepository.remove(userId, id);
    if (error) throw new Error(error.message);
    return { success: true };
};

const getAiReports = async (userId) => {
    const { data, error } = await interviewRepository.getAnalysisReports(userId);
    if (error) throw new Error(error.message);
    return data;
};

const generateAiReport = async (userId) => {
    // 1. Fetch all interviews
    const { data: interviews, error } = await interviewRepository.findAll(userId);
    if (error) throw new Error(error.message);

    if (!interviews || interviews.length === 0) {
        throw new Error('No interview data available to analyze.');
    }

    // Extract relevant data
    const interviewsData = interviews.map(i => ({
        company: i.company,
        date: i.date,
        keep: i.keep,
        improve: i.improve
    }));

    // 2. Fetch AI Configs
    const settingsService = require('./settings.service');
    const aiConfigs = await settingsService.getAllAiConfigs(userId);
    const routingProvider = aiConfigs?.ai_routing?.interviewInsights?.provider || 'groq';
    const routingModel = aiConfigs?.ai_routing?.interviewInsights?.model || null;

    const tokenKey = `${routingProvider}_token`;
    if (!aiConfigs || !aiConfigs[tokenKey]) {
        throw new Error(`API key for ${routingProvider} is not configured. Please add it in Settings.`);
    }

    // 3. Call AI Service
    let aiResponse;
    try {
        aiResponse = await axios.post('http://127.0.0.1:8001/analyze-interviews', {
            api_keys: {
                groq_token: aiConfigs.groq_token,
                openai_token: aiConfigs.openai_token,
                claude_token: aiConfigs.claude_token,
                gemini_token: aiConfigs.gemini_token
            },
            provider: routingProvider,
            model: routingModel,
            interviews_data: interviewsData
        });
    } catch (err) {
        const msg = err.response?.data?.detail || err.message;
        throw new Error(`AI Service error: ${msg}`);
    }

    const report = aiResponse.data.report;

    // 4. Save to DB
    const { data: savedReport, error: saveError } = await interviewRepository.saveAnalysisReport(userId, {
        keep_report: report.keep_report,
        improve_report: report.improve_report,
        overall_trends: report.overall_trends
    });

    if (saveError) throw new Error(`Failed to save report: ${saveError.message}`);

    return savedReport;
};

module.exports = {
    getAllInterviews,
    createInterview,
    updateInterview,
    deleteInterview,
    getAiReports,
    generateAiReport
};