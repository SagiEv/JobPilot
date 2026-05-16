const settingsService = require('../services/settings.service');

exports.getSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await settingsService.getSettings(userId, req.token);
        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.putSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await settingsService.saveSettings(userId, req.body, req.token);
        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
