const interviewService = require('../services/interviews.service');

const getAll = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await interviewService.getAllInterviews(userId);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const create = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await interviewService.createInterview(userId, req.body);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const update = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await interviewService.updateInterview(userId, req.params.id, req.body);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const remove = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await interviewService.deleteInterview(userId, req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getAiReports = async (req, res) => {
    try {
        const userId = req.user.id;
        const reports = await interviewService.getAiReports(userId);
        res.json(reports);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const generateAiReport = async (req, res) => {
    try {
        const userId = req.user.id;
        const report = await interviewService.generateAiReport(userId);
        res.json(report);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getAll,
    create,
    update,
    remove,
    getAiReports,
    generateAiReport
};