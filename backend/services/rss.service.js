const rssRepo = require('../repositories/rss.repository');

const getFeeds = async (supabaseClient) => {
    const { data, error } = await rssRepo.findAllFeeds(supabaseClient);
    if (error) throw new Error(error.message);
    return data;
};

const addFeed = async (feedData, supabaseClient) => {
    const { data, error } = await rssRepo.createFeed(feedData, supabaseClient);
    if (error) throw new Error(error.message);
    return data;
};

const updateFeed = async (id, updateData, supabaseClient) => {
    updateData.updated_at = new Date().toISOString();
    const { data, error } = await rssRepo.updateFeed(id, updateData, supabaseClient);
    if (error) throw new Error(error.message);
    return data;
};

const deleteFeed = async (id, supabaseClient) => {
    const { error } = await rssRepo.removeFeed(id, supabaseClient);
    if (error) throw new Error(error.message);
    return { success: true };
};

const getJobs = async (supabaseClient) => {
    const { data, error } = await rssRepo.findAllJobs(supabaseClient);
    if (error) throw new Error(error.message);
    return data;
};

module.exports = {
    getFeeds,
    addFeed,
    updateFeed,
    deleteFeed,
    getJobs
};
