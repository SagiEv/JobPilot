const supabase = require('../supabaseClient');

const findAll = async () => {
    return await supabase.from('contacts').select('*');
};

const create = async (contactData) => {
    return await supabase
        .from('contacts')
        .insert([contactData])
        .select()
        .single();
};

const update = async (id, updateData) => {
    return await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
};

const remove = async (id) => {
    return await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
};

const bulkInsert = async (contacts) => {
    return await supabase
        .from('contacts')
        .insert(contacts)
        .select();
};

module.exports = {
    findAll,
    create,
    update,
    remove,
    bulkInsert
};