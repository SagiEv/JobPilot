const supabase = require('../supabaseClient');

const findFirstProfile = async () => {
    return await supabase.from('profile').select('*').single();
};

const updateProfile = async (id, updateData) => {
    return await supabase
        .from('profile')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
};

const createProfile = async (updateData) => {
    return await supabase
        .from('profile')
        .insert([updateData])
        .select()
        .single();
};

module.exports = {
    findFirstProfile,
    updateProfile,
    createProfile
};