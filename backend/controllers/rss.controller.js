const rssService = require('../services/rss.service');

exports.getFeeds = async (req, res) => {
    try {
        const data = await rssService.getFeeds();
        res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.postFeed = async (req, res) => {
    try {
        const data = await rssService.addFeed(req.body);
        res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.putFeed = async (req, res) => {
    try {
        const data = await rssService.updateFeed(req.params.id, req.body);
        res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.deleteFeed = async (req, res) => {
    try {
        const result = await rssService.deleteFeed(req.params.id);
        res.json(result);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getJobs = async (req, res) => {
    try {
        const data = await rssService.getJobs();
        res.json(data);
    } catch (err) { res.status(400).json({ error: err.message }); }
};
