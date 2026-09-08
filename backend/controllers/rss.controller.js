const rssService = require('../services/rss.service');

exports.getFeeds = async (req, res) => {
    try {
        const data = await rssService.getFeeds(req.supabase);
        res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.postFeed = async (req, res) => {
    try {
        const data = await rssService.addFeed(req.body, req.supabase);
        res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.putFeed = async (req, res) => {
    try {
        const data = await rssService.updateFeed(req.params.id, req.body, req.supabase);
        res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.deleteFeed = async (req, res) => {
    try {
        const result = await rssService.deleteFeed(req.params.id, req.supabase);
        res.json(result);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getJobs = async (req, res) => {
    try {
        const data = await rssService.getJobs(req.supabase);
        res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
};
