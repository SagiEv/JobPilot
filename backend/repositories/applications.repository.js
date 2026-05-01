const supabase = require('../supabaseClient');

const findAll = async () => {
    return await supabase.from('applications').select('*');
};

const create = async (applicationData) => {
    return await supabase
        .from('applications')
        .insert([applicationData])
        .select()
        .single();
};

const update = async (id, updateData) => {
    return await supabase
        .from('applications')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
};

const remove = async (id) => {
    return await supabase
        .from('applications')
        .delete()
        .eq('id', id);
};

const bulkInsert = async (applications) => {
    return await supabase
        .from('applications')
        .insert(applications)
        .select();
};

module.exports = {
    findAll,
    create,
    update,
    remove,
    bulkInsert
};