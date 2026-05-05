const supabase = require('../supabaseClient');

const findFirstProfile = async (userId) => {
    return await supabase.from('profile').select('*').eq('id', userId).single();
};

const updateProfile = async (userId, updateData) => {
    return await supabase
        .from('profile')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();
};

const createProfile = async (userId, updateData) => {
    return await supabase
        .from('profile')
        .insert(updateData)
        .eq('id', userId)
        .select()
        .single();
};

module.exports = {
    findFirstProfile,
    updateProfile,
    createProfile
};