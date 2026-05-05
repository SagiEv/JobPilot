const searchService = require('../services/searchSettings.service');

exports.getSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await searchService.getSettings(userId);
        res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.putSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await searchService.saveSettings(userId, req.body);
        res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getSites = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await searchService.getSites(userId);
        res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.postSite = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await searchService.addSite(userId, req.body);
        res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.putSite = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await searchService.updateSite(userId, req.params.id, req.body);
        res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.deleteSite = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await searchService.deleteSite(userId, req.params.id);
        res.json(result);
    } catch (err) { res.status(400).json({ error: err.message }); }
};