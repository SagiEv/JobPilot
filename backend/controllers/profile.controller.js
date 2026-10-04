const profileService = require('../services/profile.service');

const getProfile = async (req, res) => {
    const profile = await profileService.getProfile(req.user.id, req.supabase);
    res.json(profile);
};

const updateProfile = async (req, res) => {
    const data = await profileService.upsertProfile(req.user.id, req.body, req.supabase);
    res.json(data);
};

module.exports = { getProfile, updateProfile };