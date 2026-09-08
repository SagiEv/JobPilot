

// Settings
const findSettings = async (client) => {
    return await client.from('search_settings').select('*').single();
};

const upsertSettings = async (id, updateData, client) => {
    if (id) {
        return await client.from('search_settings').update(updateData).eq('id', id).select().single();
    } else {
        return await client.from('search_settings').insert([updateData]).select().single();
    }
};

// Sites
const findAllSites = async (client) => {
    return await client.from('search_sites').select('*');
};

const createSite = async (siteData, client) => {
    return await client.from('search_sites').insert([siteData]).select().single();
};

const updateSite = async (id, updateData, client) => {
    return await client.from('search_sites').update(updateData).eq('id', id).select().single();
};

const removeSite = async (id, client) => {
    return await client.from('search_sites').delete().eq('id', id);
};

module.exports = {
    findSettings,
    upsertSettings,
    findAllSites,
    createSite,
    updateSite,
    removeSite
};