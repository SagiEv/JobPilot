const applicationService = require('../services/applications.service');

const getAll = async (req, res) => {
    try {
        const data = await applicationService.getAllApplications();
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const create = async (req, res) => {
    try {
        const data = await applicationService.createApplication(req.body);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const update = async (req, res) => {
    try {
        const data = await applicationService.updateApplication(req.params.id, req.body);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const remove = async (req, res) => {
    try {
        const result = await applicationService.deleteApplication(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const bulkCreate = async (req, res) => {
    try {
        const result = await applicationService.bulkCreateApplications(req.body.applications);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message, details: error.details });
    }
};

module.exports = {
    getAll,
    create,
    update,
    remove,
    bulkCreate
};