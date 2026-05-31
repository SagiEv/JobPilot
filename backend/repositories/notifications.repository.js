const supabase = require('../supabaseClient');

const TABLE = 'notifications';

const findByUser = async (userId, limit = 20) => {
    return await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
};

const countUnread = async (userId) => {
    const { count, error } = await supabase
        .from(TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);
    return { count: count || 0, error };
};

const insert = async (notifData) => {
    return await supabase
        .from(TABLE)
        .insert(notifData)
        .select()
        .single();
};

const markRead = async (userId, id) => {
    return await supabase
        .from(TABLE)
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', userId);
};

const markAllRead = async (userId) => {
    return await supabase
        .from(TABLE)
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
};

module.exports = { findByUser, countUnread, insert, markRead, markAllRead };
