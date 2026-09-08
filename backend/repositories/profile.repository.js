const supabase = require('../supabaseClient');

const findFirstProfile = async (userId, client) => {
    return await client.from('profile').select('*').eq('id', userId).single();
};

const updateProfile = async (userId, updateData, client) => {
    return await client
        .from('profile')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();
};

const createProfile = async (userId, updateData, client) => {
    return await client
        .from('profile')
        .insert({ id: userId, ...updateData })
        .select()
        .single();
};

module.exports = {
    findFirstProfile,
    updateProfile,
    createProfile
};