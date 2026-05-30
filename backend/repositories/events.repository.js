const supabase = require('../supabaseClient');

// Map frontend camelCase fields → DB snake_case columns
const toDb = (data) => {
    const { allDay, time, ...rest } = data; // strip 'time' (already merged into date) and map allDay
    const mapped = { ...rest };
    if (allDay !== undefined) mapped.all_day = allDay;
    return mapped;
};

// Map DB snake_case columns → frontend camelCase fields
const fromDb = (row) => {
    if (!row) return row;
    const { all_day, ...rest } = row;
    return { ...rest, allDay: all_day ?? false };
};

const findAll = async (userId) => {
    const result = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });
    if (result.data) result.data = result.data.map(fromDb);
    return result;
};

const create = async (userId, eventData) => {
    const payload = toDb(eventData);
    if (userId) payload.user_id = userId;

    const result = await supabase
        .from('events')
        .insert([payload])
        .select()
        .single();
    if (result.data) result.data = fromDb(result.data);
    return result;
};

const update = async (userId, id, updateData) => {
    const result = await supabase
        .from('events')
        .update(toDb(updateData))
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
    if (result.data) result.data = fromDb(result.data);
    return result;
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
