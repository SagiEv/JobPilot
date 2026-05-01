const searchRepo = require('../repositories/searchSettings.repository');

const getSettings = async () => {
    const { data, error } = await searchRepo.findSettings();
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data || {};
};

const saveSettings = async (payload) => {
    const { id, ...updateData } = payload;
    const { data, error } = await searchRepo.upsertSettings(id, updateData);
    if (error) throw new Error(error.message);
    return data;
};

const getSites = async () => {
    const { data, error } = await searchRepo.findAllSites();
    if (error) throw new Error(error.message);
    return data;
};

const addSite = async (siteData) => {
    const { data, error } = await searchRepo.createSite(siteData);
    if (error) throw new Error(error.message);
    return data;
};

const updateSite = async (id, updateData) => {
    const { data, error } = await searchRepo.updateSite(id, updateData);
    if (error) throw new Error(error.message);
    return data;
};

const deleteSite = async (id) => {
    const { error } = await searchRepo.removeSite(id);
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