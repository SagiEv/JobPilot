const supabase = require('../supabaseClient');

const findAllByApplicationId = async (applicationId) => {
    return await supabase
        .from('application_history')
        .select(`
            *,
            interviews (
                id,
                company,
                role,
                stage,
                date
            )
        `)
        .eq('application_id', applicationId)
        .order('event_date', { ascending: false });
};

const create = async (historyData) => {
    return await supabase
        .from('application_history')
        .insert(historyData)
        .select()
        .single();
};

const remove = async (id) => {
    return await supabase
        .from('application_history')
        .delete()
        .eq('id', id);
};

module.exports = {
    findAllByApplicationId,
    create,
    remove
};
