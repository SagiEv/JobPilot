

const findAll = async (userId, client) => {
    return await client.from('contacts').select('*').eq('user_id', userId);
};

const create = async (userId, contactData, client) => {
    return await supabase
        .from('contacts')
        .insert([{ ...contactData, user_id: userId }])
        .select()
        .single();
};

const update = async (userId, id, updateData, client) => {
    return await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
};

const remove = async (userId, id, client) => {
    return await supabase
        .from('contacts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
};

const bulkInsert = async (userId, contacts, client) => {
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