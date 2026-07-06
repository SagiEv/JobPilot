const Parser = require('rss-parser');
const axios = require('axios');
const rssRepo = require('../repositories/rss.repository');

const parser = new Parser();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001';

const pollRssFeeds = async () => {
    console.log('🔄 [RSS Poller] Starting feed polling cycle...');
    try {
        const { data: feeds, error } = await rssRepo.findAllFeeds();
        if (error) throw new Error(error.message);

        const enabledFeeds = feeds.filter(f => f.enabled);
        if (enabledFeeds.length === 0) {
            console.log('ℹ️ [RSS Poller] No enabled feeds found.');
            return;
        }

        let totalNewJobs = 0;
        let totalDuplicates = 0;
        let totalRejected = 0;
        let totalErrors = 0;

        for (const feed of enabledFeeds) {
            console.log(`📡 [RSS Poller] Fetching feed: ${feed.url}`);
            try {
                const parsedFeed = await parser.parseURL(feed.url);
                console.log(`   └─ Found ${parsedFeed.items.length} items.`);

                for (const item of parsedFeed.items) {
                    const jobUrl = item.link || item.guid;
                    if (!jobUrl) continue;

                    // Deduplication check
                    const existingJob = await rssRepo.findJobByUrl(jobUrl);
                    if (existingJob.data) {
                        totalDuplicates++;
                        continue;
                    }

                    // Normalize job payload
                    const normalizedJob = {
                        title: item.title || 'Unknown Title',
                        company: 'Google Alert Source', // Google Alerts doesn't easily expose company cleanly in XML without parsing title
                        location: 'Israel', 
                        url: jobUrl,
                        description: item.contentSnippet || item.content || item.summary || '',
                        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                    };

                    // Try extracting company from title (e.g. "Software Engineer - Google")
                    const titleParts = normalizedJob.title.split(' - ');
                    if (titleParts.length > 1) {
                        normalizedJob.company = titleParts[titleParts.length - 1].trim();
                        normalizedJob.title = titleParts.slice(0, -1).join(' - ').trim();
                    }

                    // Add GROQ API Key for the AI service by reading it from the DB
                    const { data: appSettings } = await rssRepo.findFirstAppSettings();
                    const groqApiKey = appSettings?.groq_token;
                    if (!groqApiKey) {
                        console.warn('⚠️ groq_token is missing in app_settings table! AI classification will fail.');
                    }
                    normalizedJob.groq_api_key = groqApiKey || '';

                    // Send to AI for classification
                    let classificationResult;
                    try {
                        const aiResponse = await axios.post(`${AI_SERVICE_URL}/search/classify-job`, normalizedJob, { timeout: 10000 });
                        classificationResult = aiResponse.data;
                    } catch (aiErr) {
                        console.warn(`   └─ ⚠️ AI Classification failed for ${jobUrl}: ${aiErr.message}`);
                        // If AI fails, we skip this job rather than assuming it's good or bad
                        totalErrors++;
                        continue;
                    }

                    if (classificationResult && classificationResult.is_relevant) {
                        // Save the job
                        await rssRepo.createJob({
                            feed_id: feed.id,
                            title: normalizedJob.title,
                            company: normalizedJob.company,
                            location: normalizedJob.location,
                            url: normalizedJob.url,
                            description: normalizedJob.description,
                            published_at: normalizedJob.publishedAt,
                            category: classificationResult.category || 'Software Engineering',
                            seniority: classificationResult.seniority || 'Junior'
                        });
                        totalNewJobs++;
                        console.log(`   └─ ✅ Saved relevant job: ${normalizedJob.title}`);
                    } else {
                        totalRejected++;
                    }
                }
            } catch (err) {
                console.error(`   └─ ❌ Error processing feed ${feed.url}: ${err.message}`);
                totalErrors++;
            }
        }

        console.log(`✅ [RSS Poller] Cycle complete.`);
        console.log(`   ├─ New Jobs: ${totalNewJobs}`);
        console.log(`   ├─ Duplicates Skipped: ${totalDuplicates}`);
        console.log(`   ├─ AI Rejected: ${totalRejected}`);
        console.log(`   └─ Errors: ${totalErrors}`);

    } catch (err) {
        console.error('❌ [RSS Poller] Critical failure in polling cycle:', err);
    }
};

module.exports = {
    pollRssFeeds
};
