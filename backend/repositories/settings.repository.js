const supabase = require('../supabaseClient');

const TABLE = 'app_settings';

const findSettings = async (userId, token = null) => {
    const client = token ? supabase.createAuthClient(token) : supabase;
    return await client.from(TABLE).select('*').eq('user_id', userId).limit(1).maybeSingle();
};

const upsertSettings = async (userId, data, token = null) => {
    const client = token ? supabase.createAuthClient(token) : supabase;
    const { data: existing } = await findSettings(userId, token);

    if (existing) {
        return await client
            .from(TABLE)
            .update(data)
            .eq('id', existing.id)
            .select()
            .limit(1)
            .maybeSingle();
    } else {
        const { data: inserted, error } = await client
            .from(TABLE)
            .insert({ user_id: userId, ...data })
            .select()
            .limit(1)
            .maybeSingle();
            
        // If insert fails because the row suddenly exists (race condition) or RLS
        if (error) return { data: null, error };
        return { data: inserted, error: null };
    }
};

module.exports = { findSettings, upsertSettings };
