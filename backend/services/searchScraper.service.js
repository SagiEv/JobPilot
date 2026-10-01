const axios = require('axios');
const scrapedJobsRepo = require('../repositories/scrapedJobs.repository');
const searchSettingsRepo = require('../repositories/searchSettings.repository');
const { scrapeCareerLinks } = require('../utils/scraper.util');
const AppError = require('../utils/AppError');

/**
 * Filter jobs based on keywords and exclude keywords.
 */
const filterByKeywords = (jobs, keywords = [], excludeKeywords = []) => {
    return jobs.filter(job => {
        const titleLower = job.title.toLowerCase();
        
        // If exclude keywords exist, reject matches
        if (excludeKeywords.length > 0) {
            if (excludeKeywords.some(kw => titleLower.includes(kw.toLowerCase()))) {
                return false;
            }
        }
        
        // If search keywords exist, require at least one match
        if (keywords.length > 0) {
            return keywords.some(kw => titleLower.includes(kw.toLowerCase()));
        }
        
        // No keywords = include everything
        return true;
    });
};


/**
 * Scrape a specific site for a user, filter, and save to DB.
 */
const scrapeAndSaveForUser = async (userId, site, settings) => {
    console.log(`[Scraper] Scraping site ${site.name} for user ${userId}`);
    
    const { links: allLinks } = await scrapeCareerLinks(site.url);
    if (!allLinks || allLinks.length === 0) {
         console.log(`[Scraper] No links found for ${site.name}`);
         return 0;
    }

    const keywords = settings.keywords || [];
    const excludeKeywords = settings.exclude_keywords || [];
    
    const filteredLinks = filterByKeywords(allLinks, keywords, excludeKeywords);
    console.log(`[Scraper] Site ${site.name}: found ${allLinks.length}, filtered to ${filteredLinks.length}`);

    if (filteredLinks.length > 0) {
        const jobsToInsert = filteredLinks.map(link => ({
            user_id: userId,
            site_id: site.id,
            title: link.title,
            url: link.url,
            company: site.name
        }));
        
        await scrapedJobsRepo.createJobsBatch(jobsToInsert);
    }
    
    await scrapedJobsRepo.markSiteScraped(site.id);
    return filteredLinks.length;
};

/**
 * Run a manual search for all enabled sites of a user.
 */
const runSearchForUser = async (userId, supabaseClient) => {
    const { data: settings, error: settingsError } = await searchSettingsRepo.findSettings(userId, supabaseClient);
    if (settingsError && settingsError.code !== 'PGRST116') {
        throw new AppError('Failed to load search settings: ' + settingsError.message, 400);
    }
    
    const userSettings = settings || { keywords: [], exclude_keywords: [], last_results: [] };

    const { data: sites, error: sitesError } = await searchSettingsRepo.findAllSites(userId, supabaseClient);
    if (sitesError) {
         throw new AppError('Failed to load search sites: ' + sitesError.message, 400);
    }

    const enabledSites = (sites || []).filter(s => s.enabled);
    if (enabledSites.length === 0) {
        return { message: 'No enabled sites found.', totalFound: 0, sitesScraped: 0 };
    }

    let totalFound = 0;
    for (const site of enabledSites) {
        const found = await scrapeAndSaveForUser(userId, site, userSettings);
        totalFound += found;
        // Wait a bit to avoid hitting Jina AI rate limits too hard even in manual mode
        await new Promise(r => setTimeout(r, 2000));
    }
    
    await scrapedJobsRepo.markUserScraped(userId);
    
    // Update last_results with summary
    const runSummary = {
        date: new Date().toISOString(),
        totalFound,
        sitesScraped: enabledSites.length
    };
    
    const lastResults = Array.isArray(userSettings.last_results) ? userSettings.last_results : [];
    const updatedResults = [runSummary, ...lastResults].slice(0, 10); // Keep last 10
    
    await searchSettingsRepo.upsertSettings(userId, settings?.id, { last_results: updatedResults }, supabaseClient);

    return {
        message: 'Search completed successfully.',
        totalFound,
        sitesScraped: enabledSites.length,
        summary: runSummary
    };
};

module.exports = {
    runSearchForUser,
    scrapeAndSaveForUser
};
