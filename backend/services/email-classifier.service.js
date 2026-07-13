const stringSimilarity = require('string-similarity');

// ── Status keyword dictionaries ──────────────────────────────────────────────
const STATUS_KEYWORDS = {
    interview: [
        'interview', 'schedule', 'call with', 'meet with', 'zoom link',
        'teams meeting', 'phone screen', 'on-site', 'onsite', 'virtual interview',
        'calendar invite', 'interview slot', 'book a time', 'availability'
    ],
    rejected: [
        'unfortunately', 'not moving forward', 'other candidates',
        'regret to inform', 'not selected', 'decided not to proceed',
        'will not be advancing', 'position has been filled', 'not a fit',
        'after careful consideration', 'we have decided'
    ],
    offer: [
        'offer letter', 'congratulations', 'we\'d like to offer',
        'we would like to offer', 'compensation', 'start date',
        'employment agreement', 'welcome aboard', 'pleased to offer'
    ],
    assessment: [
        'assessment', 'coding challenge', 'take-home', 'technical test',
        'online test', 'hackerrank', 'codility', 'leetcode', 'assignment'
    ],
    follow_up: [
        'following up', 'checking in', 'next steps', 'update on your application',
        'status update', 'where we are', 'wanted to let you know', 'keep you posted'
    ],
};

// Common company suffixes to strip for better matching
const COMPANY_SUFFIXES = /\b(inc|ltd|llc|gmbh|corp|co|company|group|holdings|plc|ag|sa|srl|bv)\b\.?/gi;

// Known ATS provider domain segments — company name comes from the subdomain prefix or username
const ATS_DOMAIN_SEGMENTS = new Set([
    'myworkday', 'myworkdaybio', 'greenhouse', 'lever', 'bamboohr',
    'ashbyhq', 'smartrecruiters', 'workable', 'icims', 'successfactors',
    'comeet-notifications', 'comeet', 'taleo', 'jobvite', 'recruitee',
    'pinpointhq', 'teamtailor', 'personio', 'recruitly',
]);

// Generic subdomains that carry no company-identity signal
const GENERIC_SUBDOMAINS = new Set([
    'mail', 'email', 'mailer', 'smtp', 'send', 'reply', 'noreply',
    'no-reply', 'donotreply', 'do-not-reply', 'careers', 'jobs',
    'notifications', 'alerts', 'info', 'support', 'contact', 'hr',
    'talent', 'recruiting', 'recruitment', 'bounce', 'bounce-handler',
]);

// Aggregator senders whose domain is irrelevant — real company is in subject/body
const AGGREGATOR_DOMAINS = new Set([
    'linkedin.com', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com',
    'monster.com', 'careerbuilder.com', 'dice.com',
]);

// Common TLDs to ignore when selecting the meaningful domain segment
const COMMON_TLDS = new Set(['com', 'net', 'org', 'io', 'ai', 'co', 'gov', 'edu', 'uk', 'us', 'de', 'fr', 'il']);

/**
 * Normalize a company name for matching.
 */
function normalizeCompany(name) {
    if (!name) return '';
    return name
        .toLowerCase()
        .replace(/\.(ai|io|com|net|org|co)\b/gi, '')
        .replace(COMPANY_SUFFIXES, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extract the local-part (username) from an email address, stripping generic prefixes.
 * e.g. "no-reply@kaltura.comeet-notifications.com" → local = "no-reply" (stripped → "")
 * e.g. "kaltura@comeet-notifications.com"           → local = "kaltura"
 */
function _extractCleanUsername(address) {
    const match = address.match(/^([^@]+)@/);
    if (!match) return '';
    return match[1]
        .toLowerCase()
        .replace(/^(no-reply|noreply|donotreply|do-not-reply|careers|jobs|hr|talent|info|support|hello|notifications|alerts|bounce)[-_]?/i, '')
        .trim();
}

/**
 * Extract the display name from a "Name <address>" formatted From header,
 * stripping generic words like "Careers", "Talent", "Jobs".
 * e.g. "Microsoft Careers <donotreply@email.careers.microsoft.com>" → "Microsoft"
 */
function _extractDisplayName(email) {
    const nameMatch = email.match(/^(.+?)\s*</);
    if (!nameMatch) return '';
    return nameMatch[1]
        .trim()
        .replace(/\b(careers|talent|jobs|recruiting|recruitment|hr|hiring|noreply|notifications|alerts|team|support)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extract a meaningful company identifier from an email From header.
 *
 * Strategy (in priority order):
 *  1. If the full domain is a known aggregator → return empty string so the
 *     caller falls back to subject-line extraction (handled in classifyEmail).
 *  2. If any domain segment is a known ATS provider:
 *     a. Try the subdomain prefix (e.g. "kaltura" from kaltura.comeet-notifications.com).
 *     b. Try the clean username (e.g. "kaltura" from no-reply@kaltura.comeet-notifications.com — after stripping prefix).
 *  3. Walk domain segments right-to-left (skipping TLDs and generic words);
 *     return the first meaningful segment.
 *     e.g. "donotreply@email.careers.microsoft.com" → "microsoft"
 *  4. Fall back to display name (e.g. "Microsoft Careers <…>" → "microsoft").
 *
 * @param {string} email - Raw From header value ("Name <addr>" or plain address)
 * @returns {string} Lowercase company identifier, or '' if indeterminate.
 */
function extractDomain(email) {
    if (!email) return '';

    // Separate display name and address
    const addrMatch = email.match(/<([^>]+)>/);
    const address = addrMatch ? addrMatch[1].trim() : email.trim();

    // Isolate full domain string
    const atIndex = address.indexOf('@');
    if (atIndex === -1) return '';
    const fullDomain = address.slice(atIndex + 1).toLowerCase(); // e.g. "email.careers.microsoft.com"
    const segments = fullDomain.split('.');

    // 1. Known aggregator → caller must use subject extraction
    // Check by joining last two segments (e.g. "linkedin.com")
    const rootDomain = segments.slice(-2).join('.');
    if (AGGREGATOR_DOMAINS.has(rootDomain)) {
        return ''; // Signal to classifyEmail to use subject-line extraction
    }

    // 2. ATS detection — scan all segments
    const atsSegment = segments.find(seg => ATS_DOMAIN_SEGMENTS.has(seg));
    if (atsSegment) {
        // 2a. Subdomain prefix: take the segment immediately before the ATS segment
        const atsIdx = segments.indexOf(atsSegment);
        if (atsIdx > 0) {
            const candidate = segments[atsIdx - 1];
            if (candidate && !GENERIC_SUBDOMAINS.has(candidate) && !COMMON_TLDS.has(candidate)) {
                return candidate;
            }
        }
        // 2b. Clean username
        const username = _extractCleanUsername(address);
        if (username) return username;
    }

    // 3. Walk segments right-to-left, skipping TLDs and generic words
    // Segments in order: [subdomain…, company, tld] — iterate from right
    const reversed = [...segments].reverse();
    for (const seg of reversed) {
        if (COMMON_TLDS.has(seg)) continue;
        if (GENERIC_SUBDOMAINS.has(seg)) continue;
        if (seg.length < 2) continue;
        return seg;
    }

    // 4. Display name fallback
    const displayName = _extractDisplayName(email);
    if (displayName) return displayName.toLowerCase().split(/\s+/)[0]; // first word

    return '';
}

/**
 * Classify a single email against the user's applications.
 *
 * @param {{ from: string, subject: string, bodySnippet: string }} email
 * @param {Array<{ id: number, company: string, position: string, status: string }>} applications
 * @returns {{ applicationId: number|null, matchedCompany: string|null, matchedRole: string|null, classifiedStatus: string, confidence: number }}
 */
function classifyEmail(email, applications) {
    const { from, subject, bodySnippet } = email;
    const text = `${from || ''} ${subject || ''} ${bodySnippet || ''}`.toLowerCase();
    const senderDomain = extractDomain(from);

    let bestMatch = {
        applicationId: null,
        matchedCompany: null,
        matchedRole: null,
        classifiedStatus: 'unknown',
        confidence: 0,
    };

    for (const app of applications) {
        let score = 0;
        const normCompany = normalizeCompany(app.company);
        if (!normCompany) continue;

        // 1. Company name fuzzy match against email text
        const companyInText = stringSimilarity.findBestMatch(normCompany, [text]);
        const directSimilarity = stringSimilarity.compareTwoStrings(normCompany, senderDomain);

        // Check if company name appears as a substring (strong signal)
        const substringMatch = text.includes(normCompany);

        if (directSimilarity >= 0.8) {
            score += 0.75;
        } else if (substringMatch) {
            score += 0.55;
            if (directSimilarity >= 0.5) {
                score += 0.15; // Strong domain resemblance + substring match = highly likely match
            }
        } else if (directSimilarity >= 0.5) {
            // Sender domain resembles company name
            score += 0.45;
        } else if (companyInText.bestMatch.rating >= 0.3) {
            score += 0.3;
        } else {
            // No meaningful company match — skip
            continue;
        }

        // 3. Role/position match
        const normRole = (app.position || '').toLowerCase().trim();
        if (normRole && text.includes(normRole)) {
            score += 0.2;
        } else if (normRole) {
            // Try fuzzy on individual role words (e.g. "software engineer")
            const roleWords = normRole.split(/\s+/).filter(w => w.length > 3);
            const wordHits = roleWords.filter(w => text.includes(w));
            if (wordHits.length >= Math.ceil(roleWords.length / 2)) {
                score += 0.15;
            }
        }

        // 4. Status keyword detection
        const detectedStatus = detectStatus(text);
        if (detectedStatus !== 'unknown') {
            score += 0.15;
        }

        if (score > bestMatch.confidence) {
            bestMatch = {
                applicationId: app.id,
                matchedCompany: app.company,
                matchedRole: app.position,
                classifiedStatus: detectedStatus,
                confidence: Math.min(score, 1.0),
            };
        }
    }

    // If no application matched, still try to detect a generic status
    if (!bestMatch.applicationId) {
        bestMatch.classifiedStatus = detectStatus(text);
    }

    return bestMatch;
}

/**
 * Detect status category from email text using keyword dictionaries.
 */
function detectStatus(text) {
    const STATUS_PRIORITY = {
        offer: 100,
        rejected: 80,
        interview: 60,
        assessment: 40,
        follow_up: 20
    };

    let bestStatus = 'unknown';
    let bestScore = 0;

    for (const [status, keywords] of Object.entries(STATUS_KEYWORDS)) {
        const hits = keywords.filter(kw => text.includes(kw)).length;
        if (hits > 0) {
            // Priority is dominant; extra hits give a slight bonus
            const score = STATUS_PRIORITY[status] + (hits * 2);
            if (score > bestScore) {
                bestScore = score;
                bestStatus = status;
            }
        }
    }

    return bestStatus;
}

module.exports = { classifyEmail, normalizeCompany, extractDomain, detectStatus };
