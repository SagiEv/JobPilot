const cron = require('node-cron');
const searchScraperService = require('../services/searchScraper.service');
const scrapedJobsRepo = require('../repositories/scrapedJobs.repository');

const CRON_SCHEDULE = '*/30 * * * *'; // Every 30 minutes
let isRunning = false;

const startSearchScrapeCron = () => {
    cron.schedule(CRON_SCHEDULE, async () => {
        if (isRunning) {
            console.log('⏳ [Search Cron] Previous cycle still running, skipping...');
            return;
        }
        
        console.log('🔄 [Search Cron] Starting search scrape cycle...');
        isRunning = true;
        
        try {
            // 1. Cleanup old data
            await scrapedJobsRepo.deleteOlderThan(30);
            await scrapedJobsRepo.deleteSeenOlderThan(1);
            
            // 2. Find users who need scraping
            const users = await scrapedJobsRepo.findUsersDueForScrape();
            const now = new Date();
            
            const dueUsers = users.filter(user => {
                if (user.schedule_frequency === 'Manual only') return false;
                if (!user.last_scraped_at) return true;
                
                const last = new Date(user.last_scraped_at);
                const diffDays = (now - last) / (1000 * 60 * 60 * 24);
                
                switch (user.schedule_frequency) {
                    case 'daily': return diffDays >= 1;
                    case 'weekly': return diffDays >= 7;
                    case '2 weeks': return diffDays >= 14;
                    case 'monthly': return diffDays >= 30;
                    default: return false;
                }
            });
            
            console.log(`[Search Cron] Found ${dueUsers.length} users due for scrape`);
            
            // 3. Process each due user
            for (const user of dueUsers) {
                try {
                    console.log(`[Search Cron] Processing user ${user.user_id}`);
                    
                    const sites = await scrapedJobsRepo.findEnabledSites(user.user_id);
                    if (!sites.length) continue;
                    
                    // Cap at 10 sites per cycle to avoid blowing rate limits
                    const sitesToScrape = sites.slice(0, 10);
                    let totalFound = 0;
                    
                    for (const site of sitesToScrape) {
                        const found = await searchScraperService.scrapeAndSaveForUser(user.user_id, site, user);
                        totalFound += found;
                        
                        // RATE LIMITING: Jina allows ~20/min. We wait 3 seconds between requests.
                        await new Promise(r => setTimeout(r, 3000));
                    }
                    
                    await scrapedJobsRepo.markUserScraped(user.user_id);
                    console.log(`[Search Cron] Finished user ${user.user_id} - found ${totalFound} jobs`);
                } catch (err) {
                    console.error(`[Search Cron] Error processing user ${user.user_id}:`, err.message);
                }
            }
            
            console.log('✅ [Search Cron] Cycle complete');
        } catch (error) {
            console.error('❌ [Search Cron] Critical failure:', error);
        } finally {
            isRunning = false;
        }
    });
    
    console.log('⏰ [Search Cron] Scheduled (every 30m)');
};

module.exports = { startSearchScrapeCron };
