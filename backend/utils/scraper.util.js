const axios = require('axios');

/**
 * Scrape a career/jobs page and extract job listing links.
 * Strategy: Jina AI Reader (markdown mode) as primary, static HTML regex as fallback.
 */
const scrapeCareerLinks = async (url) => {
    // Normalise the URL
    const parsedUrl = new URL(url);
    const cleanUrl = parsedUrl.origin + parsedUrl.pathname + parsedUrl.search;

    let links = [];
    let source = '';

    // ── Primary: Jina AI Reader (markdown text mode) ─────────────
    try {
        const jinaUrl = `https://r.jina.ai/${cleanUrl}`;
        const jinaRes = await axios.get(jinaUrl, {
            headers: { 'X-Gather-All-Links': 'true' },
            timeout: 30000
        });

        if (jinaRes.status === 200) {
            const markdown = jinaRes.data;
            const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
            let match;
            while ((match = mdLinkRegex.exec(markdown)) !== null) {
                const text = match[1].replace(/\s*(Read More|Apply Now|Apply|View Details|Learn More|Details)\b/gi, '').trim();
                const href = match[2].trim();
                
                // Construct absolute URL
                let absoluteUrl = href;
                if (href.startsWith('/')) {
                    absoluteUrl = parsedUrl.origin + href;
                } else if (!href.startsWith('http')) {
                    absoluteUrl = parsedUrl.origin + '/' + href;
                }
                
                if (text && absoluteUrl.startsWith('http')) {
                    links.push({ title: text, url: absoluteUrl });
                }
            }
            source = 'jina';
        }
    } catch (e) {
        // Jina failed — fall through to static fallback
    }

    // ── Fallback: Static HTML fetch + regex ──────────────────────
    if (links.length === 0) {
        try {
            const htmlRes = await axios.get(cleanUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                timeout: 20000
            });
            if (htmlRes.status === 200) {
                const html = htmlRes.data;
                const aTagRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
                let m;
                while ((m = aTagRegex.exec(html)) !== null) {
                    let href = m[1].trim();
                    const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
                    // Resolve relative URLs
                    if (href.startsWith('/')) {
                        href = parsedUrl.origin + href;
                    } else if (!href.startsWith('http')) {
                        href = parsedUrl.origin + '/' + href;
                    }
                    if (text && href.startsWith('http')) {
                        links.push({ title: text, url: href });
                    }
                }
                source = 'static';
            }
        } catch (e) {
            // Both strategies failed
        }
    }

    // ── Filter & deduplicate ─────────────────────────────────────
    const totalFound = links.length;

    // Job-related URL patterns
    const jobPatterns = ['/job/', '/jobs/', '/position', '/career', '/apply',
        '/opening', '/vacancy', '/role/', '/roles/',
        'greenhouse.io', 'lever.co', 'comeet.com', 'workday.com',
        'ashbyhq.com', 'bamboohr.com', 'smartrecruiters.com',
        'myworkday', 'icims.com', 'breezy.hr'];

    // Navigation / noise patterns to exclude
    const noisePatterns = ['linkedin.com', 'twitter.com', 'facebook.com',
        'instagram.com', 'youtube.com', 'github.com',
        'mailto:', 'tel:', 'javascript:', '#',
        '/privacy', '/terms', '/cookie', '/about-us',
        '/contact', '/blog/', '/news/'];

    const filtered = links.filter(l => {
        const lowerUrl = l.url.toLowerCase();
        const lowerTitle = l.title.toLowerCase();

        // Exclude noise
        if (noisePatterns.some(p => lowerUrl.includes(p))) return false;
        // Exclude empty / very short titles
        if (l.title.length < 3) return false;
        // Exclude generic nav links
        if (['home', 'about', 'contact', 'blog', 'news', 'login', 'signup', 'sign up'].includes(lowerTitle)) return false;

        // Include if URL matches job patterns
        if (jobPatterns.some(p => lowerUrl.includes(p))) return true;

        // If no pattern matched, include links whose titles look like job postings
        // (contains words like engineer, manager, designer, analyst, etc.)
        const jobTitleWords = ['engineer', 'developer', 'manager', 'designer', 'analyst',
            'specialist', 'coordinator', 'architect', 'lead', 'director',
            'consultant', 'advisor', 'associate', 'intern', 'scientist',
            'administrator', 'officer', 'executive', 'representative', 'accountant'];
        if (jobTitleWords.some(w => lowerTitle.includes(w))) return true;

        return false;
    });

    // Deduplicate by URL (stripping tracking params and hashes)
    const seen = new Set();
    const deduplicated = filtered.filter(l => {
        const cleanForDedupe = l.url.split('?')[0].split('#')[0];
        if (seen.has(cleanForDedupe)) return false;
        seen.add(cleanForDedupe);
        return true;
    });

    // Clean up titles — remove excessive whitespace
    deduplicated.forEach(l => {
        l.title = l.title.replace(/\s+/g, ' ').trim();
    });

    return {
        links: deduplicated,
        totalFound,
        filtered: deduplicated.length,
        source
    };
};

module.exports = { scrapeCareerLinks };
