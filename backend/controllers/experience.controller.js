const experienceService = require('../services/experience.service');

const getProjects = async (req, res) => {
    const data = await experienceService.getAllProjects(req.user.id, req.supabase);
    res.json(data);
};

const postProject = async (req, res) => {
    const data = await experienceService.createProject(req.user.id, req.body, req.supabase);
    res.json(data);
};

const putProject = async (req, res) => {
    const data = await experienceService.updateProject(req.user.id, req.params.id, req.body, req.supabase);
    res.json(data);
};

const deleteProject = async (req, res) => {
    const result = await experienceService.deleteProject(req.user.id, req.params.id, req.supabase);
    res.json(result);
};

module.exports = { getProjects, postProject, putProject, deleteProject };