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

const findDuplicate = async (userId, { company, role_id, date }, client) => {
    const cleanCompany = (company || '').trim();
    const cleanRoleId = (role_id || '').trim();
    if (!cleanCompany || !cleanRoleId) {
        return { data: null, error: null };
    }

    let query = client
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .ilike('company', cleanCompany)
        .ilike('role_id', cleanRoleId);

    if (date) {
        const dayStr = String(date).trim().slice(0, 10);
        query = query.eq('date', dayStr);
    }

    return await query.limit(1).maybeSingle();
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
    findDuplicate,
    create,
    update,
    remove,
    bulkInsert
};