const searchService = require('../services/searchSettings.service');
const scraperService = require('../services/searchScraper.service');
const scrapedJobsService = require('../services/scrapedJobs.service');

exports.getSettings = async (req, res) => {
    const data = await searchService.getSettings(req.user.id, req.supabase);
    res.json(data);
};

exports.putSettings = async (req, res) => {
    const data = await searchService.saveSettings(req.user.id, req.body, req.supabase);
    res.json(data);
};

exports.getSites = async (req, res) => {
    const data = await searchService.getSites(req.user.id, req.supabase);
    res.json(data);
};

exports.postSite = async (req, res) => {
    const data = await searchService.addSite(req.user.id, req.body, req.supabase);
    res.json(data);
};

exports.putSite = async (req, res) => {
    const data = await searchService.updateSite(req.user.id, req.params.id, req.body, req.supabase);
    res.json(data);
};

exports.deleteSite = async (req, res) => {
    const result = await searchService.deleteSite(req.user.id, req.params.id, req.supabase);
    res.json(result);
};

/* ── Scraped Jobs & Search Execution ──────────────────────────────────── */

exports.runSearch = async (req, res) => {
    const result = await scraperService.runSearchForUser(req.user.id, req.supabase);
    res.status(200).json(result);
};

exports.getScrapedJobs = async (req, res) => {
    const data = await scrapedJobsService.getJobsByUser(req.user.id, req.supabase);
    res.status(200).json(data);
};

exports.updateScrapedJob = async (req, res) => {
    const data = await scrapedJobsService.updateJob(req.user.id, req.params.id, req.body);
    res.status(200).json(data);
};

exports.deleteScrapedJob = async (req, res) => {
    const result = await scrapedJobsService.deleteJob(req.user.id, req.params.id);
    res.status(200).json(result);
};