const profileService = require('../services/profile.service');

const getProfile = async (req, res) => {
    try {
        const profile = await profileService.getProfile();
        res.json(profile);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const data = await profileService.upsertProfile(req.body);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getProfile,
    updateProfile
};