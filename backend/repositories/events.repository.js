const supabase = require('../supabaseClient');

const findAll = async (userId) => {
    return await supabase.from('events').select('*').eq('user_id', userId).order('date', { ascending: true });
};

const create = async (userId, eventData) => {
    // We optionally store user_id if RLS is setup or if it's a multi-tenant setup.
    const payload = { ...eventData };
    if (userId) payload.user_id = userId;

    return await supabase
        .from('events')
        .insert([payload])
        .select()
        .single();
};

const update = async (userId, id, updateData) => {
    return await supabase
        .from('events')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
};

const remove = async (userId, id) => {
    return await supabase
        .from('events')
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
