const skillService = require('../services/skills.service');

const getAll = async (req, res) => {
    try {
        const data = await skillService.getAllSkills();
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const create = async (req, res) => {
    try {
        const data = await skillService.createSkill(req.body);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const update = async (req, res) => {
    try {
        const data = await skillService.updateSkill(req.params.id, req.body);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const remove = async (req, res) => {
    try {
        const result = await skillService.deleteSkill(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getAll,
    create,
    update,
    remove
};