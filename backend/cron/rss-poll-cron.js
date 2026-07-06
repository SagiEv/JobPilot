const cron = require('node-cron');
const { pollRssFeeds } = require('../services/rssPoller');

const startRssPolling = () => {
    // Run every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
        console.log('⏰ [Cron] Triggering RSS Feed Poller...');
        await pollRssFeeds();
    });

    // Run it once immediately on startup
    setTimeout(() => {
        pollRssFeeds();
    }, 5000); // Wait 5 seconds after startup
};

module.exports = { startRssPolling };
