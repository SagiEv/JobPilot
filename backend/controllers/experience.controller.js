const experienceService = require('../services/experience.service');

// Projects
const getProjects = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await experienceService.getAllProjects(userId);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const postProject = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await experienceService.createProject(userId, req.body);
        res.json(data);
    } catch (error) {
        console.error("Experience Project Creation Error:", error);
        res.status(400).json({ error: error.message, details: error });
    }
};

const putProject = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await experienceService.updateProject(userId, req.params.id, req.body);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const deleteProject = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await experienceService.deleteProject(userId, req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Experience Text
const getExpText = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await experienceService.getExperienceText(userId);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const putExpText = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id, text } = req.body;
        const data = await experienceService.saveExperienceText(userId, id, text);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getProjects,
    postProject,
    putProject,
    deleteProject,
    getExpText,
    putExpText
};