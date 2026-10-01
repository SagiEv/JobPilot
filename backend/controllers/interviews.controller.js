const interviewService = require('../services/interviews.service');

const getAll = async (req, res) => {
    const data = await interviewService.getAllInterviews(req.user.id, req.supabase);
    res.json(data);
};

const create = async (req, res) => {
    const data = await interviewService.createInterview(req.user.id, req.body, req.supabase);
    res.json(data);
};

const update = async (req, res) => {
    const data = await interviewService.updateInterview(req.user.id, req.params.id, req.body, req.supabase);
    res.json(data);
};

const remove = async (req, res) => {
    const result = await interviewService.deleteInterview(req.user.id, req.params.id, req.supabase);
    res.json(result);
};

const getAiReports = async (req, res) => {
    const reports = await interviewService.getAiReports(req.user.id, req.supabase);
    res.json(reports);
};

const generateAiReport = async (req, res) => {
    const report = await interviewService.generateAiReport(req.user.id, req.supabase);
    res.json(report);
};

module.exports = { getAll, create, update, remove, getAiReports, generateAiReport };