const supabase = require('../supabaseClient');

const findAll = async (userId) => {
    return await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', userId);
};

const create = async (userId, interviewData) => {
    return await supabase
        .from('interviews')
        .insert({ ...interviewData, user_id: userId })
        .select()
        .single();
};

const update = async (userId, id, updateData) => {
    return await supabase
        .from('interviews')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
};

const remove = async (userId, id) => {
    return await supabase
        .from('interviews')
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