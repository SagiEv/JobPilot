const supabase = require('../supabaseClient');

const findAll = async () => {
    return await supabase.from('interviews').select('*');
};

const create = async (interviewData) => {
    return await supabase
        .from('interviews')
        .insert([interviewData])
        .select()
        .single();
};

const update = async (id, updateData) => {
    return await supabase
        .from('interviews')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
};

const remove = async (id) => {
    return await supabase
        .from('interviews')
        .delete()
        .eq('id', id);
};

module.exports = {
    findAll,
    create,
    update,
    remove
};