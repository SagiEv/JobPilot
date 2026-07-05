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

/**
 * Normalize a company name for matching.
 */
function normalizeCompany(name) {
    if (!name) return '';
    return name
        .toLowerCase()
        .replace(COMPANY_SUFFIXES, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extract domain from an email address.
 * e.g. "hr@google.com" → "google"
 */
function extractDomain(email) {
    if (!email) return '';
    
    // Extract actual email address if format is "Name <address>"
    const emailMatch = email.match(/<([^>]+)>/);
    const cleanEmail = emailMatch ? emailMatch[1] : email;

    const match = cleanEmail.match(/@([^.]+)/);
    if (!match) return '';

    const domain = match[1].toLowerCase();
    
    // Known ATS domains where the username before @ is the actual company name
    const atsDomains = ['myworkday', 'myworkdaybio', 'greenhouse', 'lever', 'bamboohr', 'ashbyhq', 'smartrecruiters', 'workable', 'icims', 'successfactors', 'comeet-notifications'];
    
    if (atsDomains.includes(domain)) {
        const usernameMatch = cleanEmail.match(/^([^@]+)@/);
        if (usernameMatch) {
            let username = usernameMatch[1].toLowerCase();
            // remove generic prefixes
            username = username.replace(/^(no-reply|noreply|donotreply|do-not-reply|careers|jobs|hr|talent)_?-?/i, '');
            if (username) return username;
        }
    }

    return domain;
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

        if (substringMatch) {
            score += 0.55;
        } else if (directSimilarity >= 0.5) {
            // Sender domain resembles company name
            score += 0.45;
        } else if (companyInText.bestMatch.rating >= 0.3) {
            score += 0.3;
        } else {
            // No meaningful company match — skip
            continue;
        }

        // 2. Sender domain bonus
        if (directSimilarity >= 0.6) {
            score += 0.1;
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
    let bestStatus = 'unknown';
    let bestCount = 0;

    for (const [status, keywords] of Object.entries(STATUS_KEYWORDS)) {
        const hits = keywords.filter(kw => text.includes(kw)).length;
        if (hits > bestCount) {
            bestCount = hits;
            bestStatus = status;
        }
    }

    return bestStatus;
}

module.exports = { classifyEmail, normalizeCompany, extractDomain, detectStatus };
