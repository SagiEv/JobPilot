
const TABLE = 'notifications';

const findByUser = async (userId, client) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return await client
        .from(TABLE)
        .select('*')
        .eq('user_id', userId)
        .or(`read.eq.false,and(read.eq.true,created_at.gte.${sevenDaysAgo.toISOString()})`)
        .order('created_at', { ascending: false });
};

const countUnread = async (userId, client) => {
    const { count, error } = await client
        .from(TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);
    return { count: count || 0, error };
};

const insert = async (notifData, client) => {
    const res = await client
        .from(TABLE)
        .insert(notifData)
        .select()
        .single();

    if (res.error && (res.error.message?.includes('column') || res.error.code === '42703')) {
        const { metadata, reverted, ...cleanData } = notifData;
        return await client
            .from(TABLE)
            .insert(cleanData)
            .select()
            .single();
    }
    return res;
};

const findById = async (userId, id, client) => {
    return await client
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
};

const update = async (userId, id, updateData, client) => {
    return await client
        .from(TABLE)
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
};

const markRead = async (userId, id, client) => {
    return await client
        .from(TABLE)
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', userId);
};

const markAllRead = async (userId, client) => {
    return await client
        .from(TABLE)
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
};

module.exports = { findByUser, findById, countUnread, insert, update, markRead, markAllRead };
