const supabase = require('../supabaseClient');

const TABLE = 'app_settings';

const findSettings = async (userId) => {
    return await supabase.from(TABLE).select('*').eq('user_id', userId).single();
};

const upsertSettings = async (userId, data) => {
    return await supabase
        .from(TABLE)
        .upsert({ user_id: userId, ...data }, { onConflict: 'user_id' })
        .select()
        .single();
};

module.exports = { findSettings, upsertSettings };
