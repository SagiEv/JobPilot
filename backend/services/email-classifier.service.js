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
    // Informational only — application received/confirmation. Never triggers a status
    // update or notification; used purely for conflict resolution inside detectStatus().
    applied: [
        'application was sent', 'application has been submitted',
        'we received your application', 'thank you for applying',
        'thank you for your application', 'application received',
        'successfully submitted', 'your application to',
        'we have received your application', 'confirmation of your application',
        'your application has been received', 'application confirmation',
        'we got your application', 'we\'ve received your application'
    ],
};

// Confirmation phrases that are strong enough to suppress a 'rejected' classification
// on their own. If any of these are present, the email is a confirmation, not a rejection.
const CONFIRMATION_SUPPRESSORS = [
    'application was sent',
    'application has been submitted',
    'successfully submitted',
    'we received your application',
    'your application has been received',
    'thank you for your application',
    'application received',
    'we\'ve received your application',
    'we have received your application',
];

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
 * For known aggregator senders (LinkedIn, Indeed…), extract the real target
 * company name from the subject line or body snippet, since the sender domain
 * carries no company identity.
 *
 * Returns a normalised company string or '' if no pattern matched.
 *
 * @param {string} subject
 * @param {string} bodySnippet
 * @returns {string}
 */
function extractCompanyFromSubject(subject, bodySnippet) {
    const src = subject || '';
    const body = bodySnippet || '';

    // Ordered list of [regex, captureGroup] patterns.
    // Each regex is tried against the subject first, then the body.
    const PATTERNS = [
        // LinkedIn application confirmation: "Sagi, your application was sent to Jones Software"
        /your application was sent to ([^.!?\n]+)/i,
        // LinkedIn apply confirm: "You applied to Software Engineer at Acme Corp"
        /you applied to .+ at ([^.!?\n,]+)/i,
        // LinkedIn: "Acme Corp wants to connect" / "Acme Corp viewed your profile"
        /^([A-Z][\w\s&.-]+?) (?:wants to|has viewed|viewed your|is hiring)/i,
        // LinkedIn job alert: "New jobs at Acme Corp"
        /new jobs? at ([^.!?\n,]+)/i,
        // LinkedIn message forward: "Message from Jane at Acme Corp"
        /(?:message|response) from .+ at ([^.!?\n,]+)/i,
        // Indeed / generic: "Your application to Acme Corp"
        /your application (?:to|for(?: the)?) ([^.!?\n,]+?)(?:\s+(?:has|is|was|job|role|position))/i,
        // Generic: "Application for … at Acme Corp"
        /application (?:for .+ )?at ([^.!?\n,]+)/i,
        // Generic subject "Acme Corp – Application Received" or "Acme Corp | Your application"
        /^([A-Z][\w\s&.-]+?)\s*[–|\-]\s*(?:application|your application|job application)/i,
    ];

    for (const re of PATTERNS) {
        // Try subject first
        let m = src.match(re);
        if (!m) m = body.match(re);
        if (m && m[1]) {
            return normalizeCompany(m[1].trim());
        }
    }

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

    // For aggregator senders (LinkedIn, Indeed…) extractDomain returns ''.
    // Extract the real company name from the subject/body instead.
    const isAggregator = senderDomain === '';
    const aggregatorCompany = isAggregator
        ? extractCompanyFromSubject(subject, bodySnippet)
        : '';

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

        if (isAggregator) {
            // ── Aggregator path ──────────────────────────────────────────────
            // Use the company extracted from the subject as the primary signal.
            // Fall back to substring match within the full text blob only if
            // subject extraction failed, to avoid the old noise-matching bug.
            if (aggregatorCompany) {
                const sim = stringSimilarity.compareTwoStrings(normCompany, aggregatorCompany);
                if (sim >= 0.85) {
                    score += 0.85; // Near-exact subject match — very high confidence
                } else if (sim >= 0.6) {
                    score += 0.65; // Close match (e.g. "moonactive" vs "moon active")
                } else if (aggregatorCompany.includes(normCompany) || normCompany.includes(aggregatorCompany)) {
                    score += 0.60; // Substring containment
                } else {
                    continue; // Subject extraction succeeded but company doesn't match — skip
                }
            } else {
                // Subject extraction failed; fall back to plain substring match
                // but require a higher threshold to reduce noise.
                if (!text.includes(normCompany)) continue;
                score += 0.45;
            }
        } else {
            // ── Standard (non-aggregator) path ───────────────────────────────
            const companyInText = stringSimilarity.findBestMatch(normCompany, [text]);
            const directSimilarity = stringSimilarity.compareTwoStrings(normCompany, senderDomain);
            const substringMatch = text.includes(normCompany);

            if (directSimilarity >= 0.8) {
                score += 0.75;
            } else if (substringMatch) {
                score += 0.55;
                if (directSimilarity >= 0.5) {
                    score += 0.15;
                }
            } else if (directSimilarity >= 0.5) {
                score += 0.45;
            } else if (companyInText.bestMatch.rating >= 0.3) {
                score += 0.3;
            } else {
                continue;
            }
        }

        // Role/position match (shared between both paths)
        const normRole = (app.position || '').toLowerCase().trim();
        if (normRole && text.includes(normRole)) {
            score += 0.2;
        } else if (normRole) {
            const roleWords = normRole.split(/\s+/).filter(w => w.length > 3);
            const wordHits = roleWords.filter(w => text.includes(w));
            if (wordHits.length >= Math.ceil(roleWords.length / 2)) {
                score += 0.15;
            }
        }

        // Status keyword detection
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
 *
 * Priority order: offer > rejected > interview > assessment > follow_up > applied
 *
 * Conflict resolution rules:
 *  1. If strong CONFIRMATION_SUPPRESSORS are present, 'rejected' is suppressed
 *     regardless of which rejection keywords were also matched.
 *  2. If both 'applied' and 'rejected' fire, the one with more keyword hits wins;
 *     on a tie, 'applied' wins (safer — avoids false rejections).
 *  3. 'applied' is never returned as the winner if any higher-priority status
 *     also fired, since confirmations sometimes mention interviews/offers.
 */
function detectStatus(text) {
    const STATUS_PRIORITY = {
        offer: 100,
        rejected: 80,
        interview: 60,
        assessment: 40,
        follow_up: 20,
        applied: 10,
    };

    // Tally hits per status
    const hitCounts = {};
    for (const [status, keywords] of Object.entries(STATUS_KEYWORDS)) {
        hitCounts[status] = keywords.filter(kw => text.includes(kw)).length;
    }

    // Rule 1: Confirmation suppression — strong confirmation phrase overrides 'rejected'
    const hasConfirmationSignal = CONFIRMATION_SUPPRESSORS.some(phrase => text.includes(phrase));
    if (hasConfirmationSignal && hitCounts.rejected > 0) {
        // Zero out rejected hits so it cannot win
        hitCounts.rejected = 0;
    }

    // Rule 2: applied vs rejected conflict — more hits wins; tie goes to 'applied'
    if (hitCounts.applied > 0 && hitCounts.rejected > 0) {
        if (hitCounts.applied >= hitCounts.rejected) {
            hitCounts.rejected = 0;
        } else {
            hitCounts.applied = 0;
        }
    }

    // Pick the winner using priority + hit bonus
    let bestStatus = 'unknown';
    let bestScore = 0;

    for (const [status, hits] of Object.entries(hitCounts)) {
        if (hits > 0) {
            const score = STATUS_PRIORITY[status] + (hits * 2);
            if (score > bestScore) {
                bestScore = score;
                bestStatus = status;
            }
        }
    }

    return bestStatus;
}

module.exports = { classifyEmail, normalizeCompany, extractDomain, extractCompanyFromSubject, detectStatus };
