const supabase = require('../supabaseClient');

const TABLE = 'app_settings';

const findSettings = async (userId) => {
    return await supabase.from(TABLE).select('*').eq('user_id', userId).single();
};

const upsertSettings = async (userId, data) => {
    const { data: existing } = await findSettings(userId);

    if (existing) {
        return await supabase
            .from(TABLE)
            .update(data)
            .eq('user_id', userId)
            .select()
            .single();
    } else {
        return await supabase
            .from(TABLE)
            .insert({ user_id: userId, ...data })
            .select()
            .single();
    }
};

module.exports = { findSettings, upsertSettings };
