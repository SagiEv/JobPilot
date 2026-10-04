const rssService = require('../services/rss.service');

exports.getFeeds = async (req, res) => {
    const data = await rssService.getFeeds(req.supabase);
    res.json(data);
};

exports.postFeed = async (req, res) => {
    const data = await rssService.addFeed(req.body, req.supabase);
    res.json(data);
};

exports.putFeed = async (req, res) => {
    const data = await rssService.updateFeed(req.params.id, req.body, req.supabase);
    res.json(data);
};

exports.deleteFeed = async (req, res) => {
    const result = await rssService.deleteFeed(req.params.id, req.supabase);
    res.json(result);
};

exports.getJobs = async (req, res) => {
    const data = await rssService.getJobs(req.supabase);
    res.json(data);
};
