import { GHOSTING_THRESHOLD_DAYS } from './constants';

/**
 * Utility functions for calculating Performance Analytics conversion funnels.
 */

const NORM_OFFER_STATUSES = ['offer', 'hired', 'accepted'];

/**
 * Checks if an application has reached an interview stage based on its fields,
 * attached stage, status, or associated interview records.
 */
export const hasAppReachedInterview = (
    app,
    interviewAppIds,
    interviewCompanies,
    historicalAppIds,
    eventInterviewAppIds = null,
    allowCompanyFallback = true
) => {
    if (!app) return false;
    
    // Check direct interview ID linkage
    if (app.id && interviewAppIds?.has(app.id)) return true;

    // Check scheduled interview events linkage from events table
    if (app.id && eventInterviewAppIds?.has(app.id)) return true;

    // Check transition history linkage from application_history
    if (app.id && historicalAppIds?.has(app.id)) return true;

    // Check company name in interviews table (only if company fallback is enabled)
    if (allowCompanyFallback) {
        const compName = (app.COMPANY || app.company || '').trim().toLowerCase();
        if (compName && interviewCompanies?.has(compName)) return true;
    }

    const status = (app.STATUS || app.status || '').trim().toLowerCase();
    const stage = (app.STAGE || app.stage || '').trim().toLowerCase();

    // Active or past interview status
    if (status.includes('interview')) return true;
    if (NORM_OFFER_STATUSES.includes(status)) return true;

    // Has a designated interview stage (e.g., "Recruiter / HR Screen", "Technical Interview")
    if (stage && stage !== 'applied' && stage !== 'none' && stage !== 'initial') {
        return true;
    }

    return false;
};

/**
 * Calculates Company-level Funnel metrics aggregating multiple applications per company.
 *
 * @param {Array} applications - List of application objects
 * @param {Array} interviews - List of interview records from the interviews table
 * @returns {Object} Comprehensive company funnel metrics
 */
/**
 * Helper to determine if an application is considered ghosted.
 */
export const isApplicationGhosted = (app, thresholdDays = GHOSTING_THRESHOLD_DAYS, now = new Date()) => {
    if (!app) return false;
    const s = (app.STATUS || app.status || '').toLowerCase();
    if (s === 'ignored') return true;
    const isAppActive = !s.includes('reject') && !s.includes('offer') && !s.includes('hired') && !s.includes('withdrawn');
    if (!isAppActive) return false;
    const lastDate = app.LAST_ACTIVITY_DATE || app.date || app.DATE;
    if (!lastDate) return false;
    const daysSince = Math.floor((new Date(now).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince >= thresholdDays;
};

export const calculateCompanyFunnelMetrics = (
    applications = [],
    interviews = [],
    historicalInterviewAppIds = [],
    eventInterviewAppIds = []
) => {
    const interviewAppIds = new Set(
        (interviews || []).map(i => i.application_id).filter(Boolean)
    );
    const interviewCompanies = new Set(
        (interviews || []).map(i => (i.company || '').trim().toLowerCase()).filter(Boolean)
    );
    const historicalAppIds = new Set(historicalInterviewAppIds || []);
    const eventAppIds = new Set(eventInterviewAppIds || []);

    // Group applications by normalized company name
    const companyMap = new Map();

    for (const app of applications) {
        const rawName = (app.COMPANY || app.company || '').trim();
        if (!rawName) continue;
        const key = rawName.toLowerCase();
        if (!companyMap.has(key)) {
            companyMap.set(key, { displayName: rawName, apps: [] });
        }
        companyMap.get(key).apps.push(app);
    }

    const totalCompanies = companyMap.size;
    const safeTotal = totalCompanies || 1;

    const interviewed = {
        offer: [],
        active: [],
        rejected: []
    };

    const noInterview = {
        pending: [],
        ghosted: [],
        rejected: []
    };

    for (const [, { displayName, apps }] of companyMap.entries()) {
        const reachedInterview = apps.some(app =>
            hasAppReachedInterview(app, interviewAppIds, interviewCompanies, historicalAppIds, eventAppIds, true)
        );

        if (reachedInterview) {
            // Check outcomes: Offer > Active Interview > Post-Interview Rejected
            const hasOffer = apps.some(a => {
                const s = (a.STATUS || a.status || '').toLowerCase();
                return NORM_OFFER_STATUSES.includes(s);
            });

            if (hasOffer) {
                interviewed.offer.push(displayName);
            } else {
                const isStillInterviewing = apps.some(a => {
                    const s = (a.STATUS || a.status || '').toLowerCase();
                    return s.includes('interview');
                });

                if (isStillInterviewing) {
                    interviewed.active.push(displayName);
                } else {
                    interviewed.rejected.push(displayName);
                }
            }
        } else {
            // Did not reach interview: Awaiting reply vs Ghosted vs Screening rejection
            const allRejected = apps.length > 0 && apps.every(a => {
                const s = (a.STATUS || a.status || '').toLowerCase();
                return s.includes('reject') || s.includes('withdrawn');
            });

            if (allRejected) {
                noInterview.rejected.push(displayName);
            } else {
                const hasActivePending = apps.some(a => {
                    const s = (a.STATUS || a.status || '').toLowerCase();
                    const isNonRejected = !s.includes('reject') && !s.includes('withdrawn');
                    return isNonRejected && !isApplicationGhosted(a);
                });

                if (hasActivePending) {
                    noInterview.pending.push(displayName);
                } else {
                    noInterview.ghosted.push(displayName);
                }
            }
        }
    }

    const interviewedCount = interviewed.offer.length + interviewed.active.length + interviewed.rejected.length;
    const noInterviewCount = noInterview.pending.length + noInterview.ghosted.length + noInterview.rejected.length;
    const safeInterviewed = interviewedCount || 1;
    const safeNoInterview = noInterviewCount || 1;

    const totalRejectedCount = noInterview.rejected.length + interviewed.rejected.length;
    const ghostedCount = noInterview.ghosted.length;
    const rejectionRate = +((totalRejectedCount / safeTotal) * 100).toFixed(1);
    const ghostedRate = +((ghostedCount / safeTotal) * 100).toFixed(1);

    return {
        totalCompanies,
        interviewedCount,
        noInterviewCount,
        totalRejectedCount,
        rejectionRate,
        ghostedCount,
        ghostedRate,
        interviewRate: +((interviewedCount / safeTotal) * 100).toFixed(1),
        noInterviewRate: +((noInterviewCount / safeTotal) * 100).toFixed(1),
        interviewed: {
            total: interviewedCount,
            offer: {
                count: interviewed.offer.length,
                rateOfInterviewed: +((interviewed.offer.length / safeInterviewed) * 100).toFixed(1),
                rateOfTotal: +((interviewed.offer.length / safeTotal) * 100).toFixed(1),
                companies: interviewed.offer
            },
            active: {
                count: interviewed.active.length,
                rateOfInterviewed: +((interviewed.active.length / safeInterviewed) * 100).toFixed(1),
                rateOfTotal: +((interviewed.active.length / safeTotal) * 100).toFixed(1),
                companies: interviewed.active
            },
            rejected: {
                count: interviewed.rejected.length,
                rateOfInterviewed: +((interviewed.rejected.length / safeInterviewed) * 100).toFixed(1),
                rateOfTotal: +((interviewed.rejected.length / safeTotal) * 100).toFixed(1),
                companies: interviewed.rejected
            }
        },
        noInterview: {
            total: noInterviewCount,
            pending: {
                count: noInterview.pending.length,
                rateOfNoInterview: +((noInterview.pending.length / safeNoInterview) * 100).toFixed(1),
                rateOfTotal: +((noInterview.pending.length / safeTotal) * 100).toFixed(1),
                companies: noInterview.pending
            },
            ghosted: {
                count: noInterview.ghosted.length,
                rateOfNoInterview: +((noInterview.ghosted.length / safeNoInterview) * 100).toFixed(1),
                rateOfTotal: +((noInterview.ghosted.length / safeTotal) * 100).toFixed(1),
                companies: noInterview.ghosted
            },
            rejected: {
                count: noInterview.rejected.length,
                rateOfNoInterview: +((noInterview.rejected.length / safeNoInterview) * 100).toFixed(1),
                rateOfTotal: +((noInterview.rejected.length / safeTotal) * 100).toFixed(1),
                companies: noInterview.rejected
            }
        }
    };
};


/**
 * Calculates monthly volume metrics combining applications applied and unique companies interviewed per month.
 *
 * @param {Array} applications - List of applications
 * @param {Array} interviews - List of interviews
 * @param {Array} historicalInterviewAppIds - App IDs that had interview transitions
 * @returns {Object} Monthly volume breakdown
 */
export const calculateMonthlyVolume = (
    applications = [],
    interviews = [],
    historicalInterviewAppIds = [],
    eventInterviewAppIds = [],
    events = []
) => {
    const interviewAppIds = new Set((interviews || []).map(i => i.application_id).filter(Boolean));
    const interviewCompanies = new Set((interviews || []).map(i => (i.company || '').trim().toLowerCase()).filter(Boolean));
    const historicalAppIds = new Set(historicalInterviewAppIds || []);
    const eventAppIds = new Set(eventInterviewAppIds || []);

    const currentYear = new Date().getFullYear().toString();
    const yearCompaniesSet = new Set();

    // Collect all unique months (YYYY-MM)
    const monthSet = new Set();

    (applications || []).forEach(a => {
        const d = (a.DATE || a.date || '').substring(0, 7);
        if (d && /^\d{4}-\d{2}$/.test(d)) monthSet.add(d);
    });

    (interviews || []).forEach(i => {
        const d = (i.date || '').substring(0, 7);
        if (d && /^\d{4}-\d{2}$/.test(d)) monthSet.add(d);
    });

    (events || []).forEach(e => {
        if (e.type === 'interview') {
            const d = (e.date || '').substring(0, 7);
            if (d && /^\d{4}-\d{2}$/.test(d)) monthSet.add(d);
        }
    });

    const months = Array.from(monthSet).sort().reverse().slice(0, 8);

    const monthlyApplied = {};
    const monthlyInterviews = {};

    months.forEach(m => {
        monthlyApplied[m] = 0;
        monthlyInterviews[m] = new Map();
    });

    // Count applications applied per month
    (applications || []).forEach(a => {
        const m = (a.DATE || a.date || '').substring(0, 7);
        if (m && monthlyApplied[m] !== undefined) {
            monthlyApplied[m]++;
        }
    });

    // Count unique companies interviewed per month from interviews table
    (interviews || []).forEach(i => {
        const m = (i.date || '').substring(0, 7);
        const comp = (i.company || '').trim();
        if (comp) {
            const key = comp.toLowerCase();
            if (m && monthlyInterviews[m]) {
                monthlyInterviews[m].set(key, comp);
            }
            if (m && m.startsWith(currentYear)) {
                yearCompaniesSet.add(key);
            }
        }
    });

    // Also check applications active/interviewed in each month
    (events || []).forEach(e => {
        if (e.type === 'interview') {
            const m = (e.date || '').substring(0, 7);
            const comp = (e.company || '').trim();
            if (comp) {
                const key = comp.toLowerCase();
                if (m && monthlyInterviews[m]) {
                    monthlyInterviews[m].set(key, comp);
                }
                if (m && m.startsWith(currentYear)) {
                    yearCompaniesSet.add(key);
                }
            }
        }
    });

    (applications || []).forEach(a => {
        const isInterviewed = hasAppReachedInterview(a, interviewAppIds, interviewCompanies, historicalAppIds, eventAppIds, true);
        if (!isInterviewed) return;

        const comp = (a.COMPANY || a.company || '').trim();
        if (!comp) return;
        const key = comp.toLowerCase();

        const m = (a.DATE || a.date || '').substring(0, 7);
        if (m && monthlyInterviews[m] && !monthlyInterviews[m].has(key)) {
            monthlyInterviews[m].set(key, comp);
        }

        if (m && m.startsWith(currentYear)) {
            yearCompaniesSet.add(key);
        }
    });

    const monthlyInterviewCounts = {};
    let maxVolume = 1;

    months.forEach(m => {
        const applied = monthlyApplied[m] || 0;
        const interviewed = monthlyInterviews[m] ? monthlyInterviews[m].size : 0;
        monthlyInterviewCounts[m] = interviewed;
        if (applied > maxVolume) maxVolume = applied;
        if (interviewed > maxVolume) maxVolume = interviewed;
    });

    return {
        months,
        monthlyApplied,
        monthlyInterviewCounts,
        monthlyInterviewCompanies: Object.fromEntries(
            Object.entries(monthlyInterviews).map(([m, map]) => [m, Array.from(map.values())])
        ),
        maxVolume,
        companiesInterviewedThisYear: yearCompaniesSet.size
    };
};

/**
 * Calculates Referral Impact metrics at the application level, comparing
 * applications with a referral vs direct applications among those that reached screening/interview.
 *
 * @param {Array} applications - List of applications
 * @param {Array} interviews - List of interviews
 * @param {Array} historicalInterviewAppIds - App IDs that had interview transitions
 * @returns {Object} Referral impact analytics
 */
export const calculateReferralMetrics = (
    applications = [],
    interviews = [],
    historicalInterviewAppIds = [],
    eventInterviewAppIds = []
) => {
    const interviewAppIds = new Set((interviews || []).map(i => i.application_id).filter(Boolean));
    const interviewCompanies = new Set((interviews || []).map(i => (i.company || '').trim().toLowerCase()).filter(Boolean));
    const historicalAppIds = new Set(historicalInterviewAppIds || []);
    const eventAppIds = new Set(eventInterviewAppIds || []);

    const isReferralApp = (app) => {
        const ref = (app.REFERAL || app.referal || app.referral || app.REFERRAL || '').trim();
        if (!ref) return false;
        const lower = ref.toLowerCase();
        return !['none', 'no', 'n/a', 'false', '0', '-'].includes(lower);
    };

    const getOutcome = (app) => {
        const s = (app.STATUS || app.status || '').toLowerCase();
        if (NORM_OFFER_STATUSES.includes(s)) return 'offer';
        if (s.includes('interview')) return 'active';
        return 'rejected';
    };

    const getFitScore = (app) => {
        return app.fit_analysis_ai?.ai_score ?? app.fit_analysis_ai?.overall_score ?? app.fit_score_deterministic;
    };

    let totalReferredCount = 0;
    let totalDirectCount = 0;

    const referredInterviewApps = [];
    const directInterviewApps = [];

    let referredFitSum = 0;
    let referredFitCount = 0;
    let directFitSum = 0;
    let directFitCount = 0;

    (applications || []).forEach(app => {
        const hasRef = isReferralApp(app);
        if (hasRef) {
            totalReferredCount++;
        } else {
            totalDirectCount++;
        }

        // At application level, do NOT use loose company fallback across sibling roles
        const reached = hasAppReachedInterview(
            app,
            interviewAppIds,
            interviewCompanies,
            historicalAppIds,
            eventAppIds,
            false // allowCompanyFallback = false
        );
        if (!reached) return;

        const company = (app.COMPANY || app.company || '').trim();
        const role = (app.ROLE_ID || app.role_id || '').trim();
        const label = role ? `${company} • ${role}` : company;
        const outcome = getOutcome(app);
        const fitScore = getFitScore(app);

        const item = {
            id: app.id,
            company,
            role,
            label,
            outcome,
            fitScore
        };

        if (hasRef) {
            referredInterviewApps.push(item);
            if (fitScore != null) {
                referredFitSum += fitScore;
                referredFitCount++;
            }
        } else {
            directInterviewApps.push(item);
            if (fitScore != null) {
                directFitSum += fitScore;
                directFitCount++;
            }
        }
    });

    const totalInterviewedApps = referredInterviewApps.length + directInterviewApps.length;
    const safeTotalInterviewed = totalInterviewedApps || 1;
    const safeTotalReferred = totalReferredCount || 1;
    const safeTotalDirect = totalDirectCount || 1;

    const refInterviewRate = +((referredInterviewApps.length / safeTotalReferred) * 100).toFixed(1);
    const directInterviewRate = +((directInterviewApps.length / safeTotalDirect) * 100).toFixed(1);

    const refShareOfInterviews = +((referredInterviewApps.length / safeTotalInterviewed) * 100).toFixed(1);
    const directShareOfInterviews = +((directInterviewApps.length / safeTotalInterviewed) * 100).toFixed(1);

    let lift = null;
    if (directInterviewRate > 0) {
        lift = +(refInterviewRate / directInterviewRate).toFixed(1);
    } else if (refInterviewRate > 0) {
        lift = +(refInterviewRate / 1).toFixed(1);
    }

    const summarizeOutcomes = (appsList) => {
        const count = appsList.length;
        const safe = count || 1;
        const offers = appsList.filter(a => a.outcome === 'offer').length;
        const active = appsList.filter(a => a.outcome === 'active').length;
        const rejected = appsList.filter(a => a.outcome === 'rejected').length;
        return {
            total: count,
            offers: { count: offers, pct: +((offers / safe) * 100).toFixed(1) },
            active: { count: active, pct: +((active / safe) * 100).toFixed(1) },
            rejected: { count: rejected, pct: +((rejected / safe) * 100).toFixed(1) }
        };
    };

    return {
        hasData: applications.length > 0,
        totalReferredCount,
        totalDirectCount,
        totalInterviewedApps,
        refShareOfInterviews,
        directShareOfInterviews,
        refInterviewRate,
        directInterviewRate,
        lift,
        referred: {
            interviewApps: referredInterviewApps,
            outcomes: summarizeOutcomes(referredInterviewApps),
            avgFit: referredFitCount > 0 ? Math.round(referredFitSum / referredFitCount) : null
        },
        direct: {
            interviewApps: directInterviewApps,
            outcomes: summarizeOutcomes(directInterviewApps),
            avgFit: directFitCount > 0 ? Math.round(directFitSum / directFitCount) : null
        }
    };
};
