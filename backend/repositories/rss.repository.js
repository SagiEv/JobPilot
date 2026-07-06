const { adminSupabase } = require('../supabaseClient');

const findAllFeeds = async () => {
    return await adminSupabase.from('rss_feeds').select('*');
};

const createFeed = async (feedData) => {
    return await adminSupabase.from('rss_feeds').insert([feedData]).select().single();
};

const updateFeed = async (id, updateData) => {
    return await adminSupabase.from('rss_feeds').update(updateData).eq('id', id).select().single();
};

const removeFeed = async (id) => {
    return await adminSupabase.from('rss_feeds').delete().eq('id', id);
};

// Jobs
const findAllJobs = async () => {
    return await adminSupabase.from('rss_jobs').select('*').order('created_at', { ascending: false });
};

const createJob = async (jobData) => {
    return await adminSupabase.from('rss_jobs').insert([jobData]).select().single();
};

const findJobByUrl = async (url) => {
    return await adminSupabase.from('rss_jobs').select('*').eq('url', url).maybeSingle();
};

const findFirstAppSettings = async () => {
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
