const supabase = require('../supabaseClient');

const findAll = async (userId) => {
    return await supabase.from('contacts').select('*').eq('user_id', userId);
};

const create = async (userId, contactData) => {
    return await supabase
        .from('contacts')
        .insert([contactData])
        .select()
        .single();
};

const update = async (userId, id, updateData) => {
    return await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
};

const remove = async (userId, id) => {
    return await supabase
        .from('contacts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
};

const bulkInsert = async (userId, contacts) => {
    return await supabase
        .from('contacts')
        .insert(contacts.map(contact => ({ ...contact, user_id: userId })))
        .select();
};

module.exports = {
    findAll,
    create,
    update,
    remove,
    bulkInsert
};