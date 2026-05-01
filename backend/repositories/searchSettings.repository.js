const supabase = require('../supabaseClient');

// Settings
const findSettings = async () => {
    return await supabase.from('search_settings').select('*').single();
};

const upsertSettings = async (id, updateData) => {
    if (id) {
        return await supabase.from('search_settings').update(updateData).eq('id', id).select().single();
    } else {
        return await supabase.from('search_settings').insert([updateData]).select().single();
    }
};

// Sites
const findAllSites = async () => {
    return await supabase.from('search_sites').select('*');
};

const createSite = async (siteData) => {
    return await supabase.from('search_sites').insert([siteData]).select().single();
};

const updateSite = async (id, updateData) => {
    return await supabase.from('search_sites').update(updateData).eq('id', id).select().single();
};

const removeSite = async (id) => {
    return await supabase.from('search_sites').delete().eq('id', id);
};

module.exports = {
    findSettings,
    upsertSettings,
    findAllSites,
    createSite,
    updateSite,
    removeSite
};