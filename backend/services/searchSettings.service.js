const searchRepo = require('../repositories/searchSettings.repository');

const getSettings = async (userId, supabaseClient) => {
    const { data, error } = await searchRepo.findSettings(userId, supabaseClient);
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data || {};
};

const saveSettings = async (userId, payload, supabaseClient) => {
    const { id, ...updateData } = payload;
    const { data, error } = await searchRepo.upsertSettings(userId, id, updateData, supabaseClient);
    if (error) throw new Error(error.message);
    return data;
};

const getSites = async (userId, supabaseClient) => {
    const { data, error } = await searchRepo.findAllSites(userId, supabaseClient);
    if (error) throw new Error(error.message);
    return data;
};

const addSite = async (userId, siteData, supabaseClient) => {
    const { data, error } = await searchRepo.createSite(userId, siteData, supabaseClient);
    if (error) throw new Error(error.message);
    return data;
};

const updateSite = async (userId, id, updateData, supabaseClient) => {
    const { data, error } = await searchRepo.updateSite(userId, id, updateData, supabaseClient);
    if (error) throw new Error(error.message);
    return data;
};

const deleteSite = async (userId, id, supabaseClient) => {
    const { error } = await searchRepo.removeSite(userId, id, supabaseClient);
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