const supabase = require('../supabaseClient');

const findAll = async (userId) => {
    return await supabase.from('skills').select('*').eq('user_id', userId);
};

const create = async (userId, skillData) => {
    return await supabase
        .from('skills')
        .insert([{ user_id: userId, ...skillData }])
        .select()
        .single();
};

const update = async (userId, id, updateData) => {
    return await supabase
        .from('skills')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
};

const remove = async (userId, id) => {
    return await supabase
        .from('skills')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
};

module.exports = {
    findAll,
    create,
    update,
    remove
};