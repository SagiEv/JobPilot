const skillService = require('../services/skills.service');

const getAll = async (req, res) => {
    const data = await skillService.getAllSkills(req.user.id, req.supabase);
    res.json(data);
};

const create = async (req, res) => {
    const data = await skillService.createSkill(req.user.id, req.body, req.supabase);
    res.json(data);
};

const update = async (req, res) => {
    const data = await skillService.updateSkill(req.user.id, req.params.id, req.body, req.supabase);
    res.json(data);
};

const remove = async (req, res) => {
    const result = await skillService.deleteSkill(req.user.id, req.params.id, req.supabase);
    res.json(result);
};

module.exports = { getAll, create, update, remove };