const findAllByApplicationId = async (applicationId, client) => {
    return await client
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

const create = async (historyData, client) => {
    return await client
        .from('application_history')
        .insert(historyData)
        .select()
        .single();
};

const remove = async (id, client) => {
    return await client
        .from('application_history')
        .delete()
        .eq('id', id);
};

const update = async (id, historyData, client) => {
    return await client
        .from('application_history')
        .update(historyData)
        .eq('id', id)
        .select()
        .single();
};

/**
 * Fetch lightweight history for multiple applications (for last_activity_date calculation).
 */
const findLatestDatesByAppIds = async (appIds, client) => {
    return await client
        .from('application_history')
        .select('application_id, event_date, created_at, event_type')
        .in('application_id', appIds);
};

/**
 * Fetch full history for multiple applications (for analytics metrics).
 */
const findByAppIds = async (appIds, client) => {
    return await client
        .from('application_history')
        .select('*')
        .in('application_id', appIds)
        .order('event_date', { ascending: true });
};

/**
 * Fetch history for multiple applications within a date range (for daily stats).
 */
const findByAppIdsInDateRange = async (appIds, startIso, endIso, client) => {
    return await client
        .from('application_history')
        .select('event_type, new_status, event_date')
        .in('application_id', appIds)
        .gte('event_date', startIso)
        .lte('event_date', endIso);
};

module.exports = {
    findAllByApplicationId,
    create,
    update,
    remove,
    findLatestDatesByAppIds,
    findByAppIds,
    findByAppIdsInDateRange
};
