const applicationService = require('../services/applications.service');

const getAll = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized: User not found" });
        }
        const userId = req.user.id;
        const data = await applicationService.getAllApplications(userId);

        console.log("getAllApplications: data", data);

        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const create = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized: User not found" });
        }
        const userId = req.user.id;
        const data = await applicationService.createApplication(userId, req.body);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const update = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized: User not found" });
        }
        const userId = req.user.id;
        const data = await applicationService.updateApplication(userId, req.params.id, req.body);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const remove = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await applicationService.deleteApplication(userId, req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const bulkCreate = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await applicationService.bulkCreateApplications(userId, req.body.applications);
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