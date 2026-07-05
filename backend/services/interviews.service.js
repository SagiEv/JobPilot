const interviewRepository = require('../repositories/interviews.repository');

const getAllInterviews = async (userId) => {
    const { data, error } = await interviewRepository.findAll(userId);
    if (error) throw new Error(error.message);
    return data;
};

const createInterview = async (userId, data) => {
    const { data: newInterview, error } = await interviewRepository.create(userId, data);
    if (error) throw new Error(error.message);
    return newInterview;
};

const updateInterview = async (userId, id, data) => {
    const { data: updatedInterview, error } = await interviewRepository.update(userId, id, data);
    if (error) throw new Error(error.message);
    return updatedInterview;
};

const axios = require('axios');
const settingsRepository = require('../repositories/settings.repository');

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

    // 2. Fetch Groq API Key
    const { data: settings } = await settingsRepository.findSettings(userId);
    if (!settings || !settings.groq_token) {
        throw new Error('Missing Groq API token. Please configure it in settings.');
    }

    // 3. Call AI Service
    let aiResponse;
    try {
        aiResponse = await axios.post('http://127.0.0.1:8001/analyze-interviews', {
            groq_api_key: settings.groq_token,
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