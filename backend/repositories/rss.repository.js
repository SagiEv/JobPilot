const { adminSupabase } = require('../supabaseClient');

const findAllFeeds = async (client) => {
    return await adminSupabase.from('rss_feeds').select('*');
};

const createFeed = async (feedData, client) => {
    return await adminSupabase.from('rss_feeds').insert([feedData]).select().single();
};

const updateFeed = async (id, updateData, client) => {
    return await adminSupabase.from('rss_feeds').update(updateData).eq('id', id).select().single();
};

const removeFeed = async (id, client) => {
    return await adminSupabase.from('rss_feeds').delete().eq('id', id);
};

// Jobs
const findAllJobs = async (client) => {
    return await adminSupabase.from('rss_jobs').select('*').order('created_at', { ascending: false });
};

const createJob = async (jobData, client) => {
    return await adminSupabase.from('rss_jobs').insert([jobData]).select().single();
};

const findJobByUrl = async (url, client) => {
    return await adminSupabase.from('rss_jobs').select('*').eq('url', url).maybeSingle();
};

const findFirstAppSettings = async (client) => {
    return await adminSupabase.from('app_settings').select('groq_token').limit(1).maybeSingle();
};

module.exports = {
    findAllFeeds,
    createFeed,
    updateFeed,
    removeFeed,
    findAllJobs,
    createJob,
    findJobByUrl,
    findFirstAppSettings
};
