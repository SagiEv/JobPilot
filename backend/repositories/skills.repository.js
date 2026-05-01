const supabase = require('../supabaseClient');

const findAll = async () => {
    return await supabase.from('skills').select('*');
};

const create = async (skillData) => {
    return await supabase
        .from('skills')
        .insert([skillData])
        .select()
        .single();
};

const update = async (id, updateData) => {
    return await supabase
        .from('skills')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
};

const remove = async (id) => {
    return await supabase
        .from('skills')
        .delete()
        .eq('id', id);
};

module.exports = {
    findAll,
    create,
    update,
    remove
};