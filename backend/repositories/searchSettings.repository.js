

// Settings
const findSettings = async (userId, client) => {
    return await client.from('search_settings').select('*').eq('user_id', userId).single();
};

const upsertSettings = async (userId, id, updateData, client) => {
    if (id) {
        return await client.from('search_settings').update(updateData).eq('id', id).eq('user_id', userId).select().single();
    } else {
        return await client.from('search_settings').insert([{ ...updateData, user_id: userId }]).select().single();
    }
};

// Sites
const findAllSites = async (userId, client) => {
    return await client.from('search_sites').select('*').eq('user_id', userId);
};

const createSite = async (userId, siteData, client) => {
    return await client.from('search_sites').insert([{ ...siteData, user_id: userId }]).select().single();
};

const updateSite = async (userId, id, updateData, client) => {
    return await client.from('search_sites').update(updateData).eq('id', id).eq('user_id', userId).select().single();
};

const removeSite = async (userId, id, client) => {
    return await client.from('search_sites').delete().eq('id', id).eq('user_id', userId);
};

module.exports = {
    findSettings,
    upsertSettings,
    findAllSites,
    createSite,
    updateSite,
    removeSite
};