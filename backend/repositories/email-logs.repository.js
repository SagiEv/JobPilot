const supabase = require('../supabaseClient');

const TABLE = 'email_logs';

const findByUser = async (userId, limit = 50) => {
    return await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('received_at', { ascending: false })
        .limit(limit);
};

const findByMessageId = async (userId, messageId) => {
    return await supabase
        .from(TABLE)
        .select('id')
        .eq('user_id', userId)
        .eq('message_id', messageId)
        .maybeSingle();
};

const insert = async (logData) => {
    return await supabase
        .from(TABLE)
        .insert(logData)
        .select()
        .single();
};

const bulkInsert = async (logs) => {
    if (!logs.length) return { data: [], error: null };
    return await supabase
        .from(TABLE)
        .insert(logs)
        .select();
};

module.exports = { findByUser, findByMessageId, insert, bulkInsert };
