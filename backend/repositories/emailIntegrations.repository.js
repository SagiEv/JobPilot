const TABLE = 'email_integrations';

const findByUser = async (userId, client) => {
    return await client
        .from(TABLE)
        .select('connected_email, sync_status, last_synced_at')
        .eq('user_id', userId)
        .single();
};

const upsert = async (integrationData, client) => {
    return await client
        .from(TABLE)
        .upsert(integrationData, { onConflict: 'user_id' });
};

const updateSyncStatus = async (userId, statusData, client) => {
    return await client
        .from(TABLE)
        .update(statusData)
        .eq('user_id', userId);
};

const remove = async (userId, client) => {
    return await client
        .from(TABLE)
        .delete()
        .eq('user_id', userId);
};

module.exports = { findByUser, upsert, updateSyncStatus, remove };
