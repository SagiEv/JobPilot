const skillService = require('../services/skills.service');

const getAll = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await skillService.getAllSkills(userId);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const create = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await skillService.createSkill(userId, req.body);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const update = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await skillService.updateSkill(userId, req.params.id, req.body);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const remove = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await skillService.deleteSkill(userId, req.params.id);
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