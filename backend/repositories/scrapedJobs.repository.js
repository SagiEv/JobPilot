const { adminSupabase } = require('../supabaseClient');
const AppError = require('../utils/AppError');

// ── Queries ──────────────────────────────────────────────────────

const findByUser = async (userId, client) => {
    return await (client || adminSupabase)
        .from('scraped_jobs')
        .select('*')
        .eq('user_id', userId)
        .eq('dismissed', false)
        .order('bookmarked', { ascending: false })
        .order('scraped_at', { ascending: false });
};

const findByUrl = async (userId, url, client) => {
    return await (client || adminSupabase)
        .from('scraped_jobs')
        .select('id')
        .eq('user_id', userId)
        .eq('url', url)
        .maybeSingle();
};

// ── Mutations ────────────────────────────────────────────────────

const createJob = async (jobData, client) => {
    return await (client || adminSupabase)
        .from('scraped_jobs')
        .upsert([jobData], { onConflict: 'user_id,url', ignoreDuplicates: true })
        .select()
        .single();
};

const createJobsBatch = async (jobs, client) => {
    if (!jobs.length) return { data: [], error: null };
    return await (client || adminSupabase)
        .from('scraped_jobs')
        .upsert(jobs, { onConflict: 'user_id,url', ignoreDuplicates: true })
        .select();
};

const updateJob = async (userId, id, updateData, client) => {
    return await (client || adminSupabase)
        .from('scraped_jobs')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
};

const deleteJob = async (userId, id, client) => {
    return await (client || adminSupabase)
        .from('scraped_jobs')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
};

// ── Cleanup ──────────────────────────────────────────────────────

const deleteOlderThan = async (daysAgo, client) => {
    const cutoff = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    return await (client || adminSupabase)
        .from('scraped_jobs')
        .delete()
        .eq('bookmarked', false)
        .lt('scraped_at', cutoff);
};

const deleteSeenOlderThan = async (daysAgo, client) => {
    const cutoff = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    return await (client || adminSupabase)
        .from('scraped_jobs')
        .delete()
        .eq('seen', true)
        .eq('bookmarked', false)
        .lt('seen_at', cutoff);
};

// ── Multi-user cron helpers ──────────────────────────────────────

/** Get all users with enabled search sites that are due for scraping */
const findUsersDueForScrape = async (client) => {
    // Get all search_settings rows with their schedule_frequency
    const { data, error } = await (client || adminSupabase)
        .from('search_settings')
        .select('user_id, schedule_frequency, last_scraped_at, keywords, exclude_keywords');
    if (error) throw new AppError(error.message, 400);
    return data || [];
};

/** Get enabled sites for a user */
const findEnabledSites = async (userId, client) => {
    const { data, error } = await (client || adminSupabase)
        .from('search_sites')
        .select('*')
        .eq('user_id', userId)
        .eq('enabled', true);
    if (error) throw new AppError(error.message, 400);
    return data || [];
};

/** Update last_scraped_at on a site */
const markSiteScraped = async (siteId, client) => {
    return await (client || adminSupabase)
        .from('search_sites')
        .update({ last_scraped_at: new Date().toISOString() })
        .eq('id', siteId);
};

/** Update last_scraped_at on user settings */
const markUserScraped = async (userId, client) => {
    return await (client || adminSupabase)
        .from('search_settings')
        .update({ last_scraped_at: new Date().toISOString() })
        .eq('user_id', userId);
};

module.exports = {
    findByUser,
    findByUrl,
    createJob,
    createJobsBatch,
    updateJob,
    deleteJob,
    deleteOlderThan,
    deleteSeenOlderThan,
    findUsersDueForScrape,
    findEnabledSites,
    markSiteScraped,
    markUserScraped
};
