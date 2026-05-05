const searchRepo = require('../repositories/searchSettings.repository');

const getSettings = async (userId) => {
    const { data, error } = await searchRepo.findSettings(userId);
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data || {};
};

const saveSettings = async (userId, payload) => {
    const { id, ...updateData } = payload;
    const { data, error } = await searchRepo.upsertSettings(userId, id, updateData);
    if (error) throw new Error(error.message);
    return data;
};

const getSites = async (userId) => {
    const { data, error } = await searchRepo.findAllSites(userId);
    if (error) throw new Error(error.message);
    return data;
};

const addSite = async (userId, siteData) => {
    const { data, error } = await searchRepo.createSite(userId, siteData);
    if (error) throw new Error(error.message);
    return data;
};

const updateSite = async (userId, id, updateData) => {
    const { data, error } = await searchRepo.updateSite(userId, id, updateData);
    if (error) throw new Error(error.message);
    return data;
};

const deleteSite = async (userId, id) => {
    const { error } = await searchRepo.removeSite(userId, id);
    if (error) throw new Error(error.message);
    return { success: true };
};

module.exports = {
    getSettings,
    saveSettings,
    getSites,
    addSite,
    updateSite,
    deleteSite
};