const searchService = require('../services/searchSettings.service');

exports.getSettings = async (req, res) => {
    try {
        const data = await searchService.getSettings();
        res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.putSettings = async (req, res) => {
    try {
        const data = await searchService.saveSettings(req.body);
        res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getSites = async (req, res) => {
    try {
        const data = await searchService.getSites();
        res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.postSite = async (req, res) => {
    try {
        const data = await searchService.addSite(req.body);
        res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.putSite = async (req, res) => {
    try {
        const data = await searchService.updateSite(req.params.id, req.body);
        res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.deleteSite = async (req, res) => {
    try {
        const result = await searchService.deleteSite(req.params.id);
        res.json(result);
    } catch (err) { res.status(400).json({ error: err.message }); }
};