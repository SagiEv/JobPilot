const { pollAllUsers } = require('../services/mail-poller.service');

const POLL_CYCLE_MS = 5 * 60 * 1000; // Check every 5 minutes which users need polling

let intervalId = null;

function startMailPolling() {
    if (intervalId) return; // Already running

    console.log('[MAIL CRON] Mail polling started (cycle: every 5 min)');

    // Run once immediately on startup (delayed 10s to let the server boot)
    setTimeout(async () => {
        try {
            await pollAllUsers();
        } catch (err) {
            console.error('[MAIL CRON] Initial poll error:', err.message);
        }
    }, 10000);

    // Then run on interval
    intervalId = setInterval(async () => {
        try {
            await pollAllUsers();
        } catch (err) {
            console.error('[MAIL CRON] Poll cycle error:', err.message);
        }
    }, POLL_CYCLE_MS);
}

function stopMailPolling() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('[MAIL CRON] Mail polling stopped');
    }
}

module.exports = { startMailPolling, stopMailPolling };
