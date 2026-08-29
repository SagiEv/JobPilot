const supabase = require('../supabaseClient');

const findAll = async (userId) => {
    return await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId);
};

const findById = async (userId, id) => {
    return await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
};

const create = async (userId, applicationData) => {
    return await supabase
        .from('applications')
        .insert({ ...applicationData, user_id: userId })
        .select()
        .single();
};

const update = async (userId, id, updateData) => {
    return await supabase
        .from('applications')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
};

const remove = async (userId, id) => {
    return await supabase
        .from('applications')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
};

const bulkInsert = async (userId, applications) => {
    return await supabase
        .from('applications')
        .insert(applications.map(app => ({ ...app, user_id: userId })))
        .select();
};

module.exports = {
    findAll,
    findById,
    create,
    update,
    remove,
    bulkInsert
};