const supabase = require('../supabaseClient');

const findAll = async (userId, client) => {
    return await client
        .from('applications')
        .select('*')
        .eq('user_id', userId);
};

const findById = async (userId, id, client) => {
    return await client
        .from('applications')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
};

const create = async (userId, applicationData, client) => {
    return await client
        .from('applications')
        .insert({ ...applicationData, user_id: userId })
        .select()
        .single();
};

const update = async (userId, id, updateData, client) => {
    return await client
        .from('applications')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
};

const remove = async (userId, id, client) => {
    return await client
        .from('applications')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
};

const bulkInsert = async (userId, applications, client) => {
    return await client
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