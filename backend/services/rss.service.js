const rssRepo = require('../repositories/rss.repository');

const getFeeds = async () => {
    const { data, error } = await rssRepo.findAllFeeds();
    if (error) throw new Error(error.message);
    return data;
};

const addFeed = async (feedData) => {
    const { data, error } = await rssRepo.createFeed(feedData);
    if (error) throw new Error(error.message);
    return data;
};

const updateFeed = async (id, updateData) => {
    updateData.updated_at = new Date().toISOString();
    const { data, error } = await rssRepo.updateFeed(id, updateData);
    if (error) throw new Error(error.message);
    return data;
};

const deleteFeed = async (id) => {
    const { error } = await rssRepo.removeFeed(id);
    if (error) throw new Error(error.message);
    return { success: true };
};

const getJobs = async () => {
    const { data, error } = await rssRepo.findAllJobs();
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
