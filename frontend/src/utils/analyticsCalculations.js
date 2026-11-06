/**
 * Utility functions for calculating Performance Analytics conversion funnels.
 */

const NORM_OFFER_STATUSES = ['offer', 'hired', 'accepted'];

/**
 * Checks if an application has reached an interview stage based on its fields,
 * attached stage, status, or associated interview records.
 */
export const hasAppReachedInterview = (app, interviewAppIds, interviewCompanies, historicalAppIds) => {
    if (!app) return false;
    
    // Check direct interview ID linkage
    if (app.id && interviewAppIds?.has(app.id)) return true;

    // Check transition history linkage from application_history
    if (app.id && historicalAppIds?.has(app.id)) return true;

    // Check company name in interviews table
    const compName = (app.COMPANY || app.company || '').trim().toLowerCase();
    if (compName && interviewCompanies?.has(compName)) return true;

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
export const calculateCompanyFunnelMetrics = (applications = [], interviews = [], historicalInterviewAppIds = []) => {
    const interviewAppIds = new Set(
        (interviews || []).map(i => i.application_id).filter(Boolean)
    );
    const interviewCompanies = new Set(
        (interviews || []).map(i => (i.company || '').trim().toLowerCase()).filter(Boolean)
    );
    const historicalAppIds = new Set(historicalInterviewAppIds || []);

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
        rejected: []
    };

    for (const [, { displayName, apps }] of companyMap.entries()) {
        const reachedInterview = apps.some(app =>
            hasAppReachedInterview(app, interviewAppIds, interviewCompanies, historicalAppIds)
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
            // Did not reach interview: Awaiting reply vs Screening rejection
            const allRejected = apps.length > 0 && apps.every(a => {
                const s = (a.STATUS || a.status || '').toLowerCase();
                return s.includes('reject') || s === 'ignored';
            });

            if (allRejected) {
                noInterview.rejected.push(displayName);
            } else {
                noInterview.pending.push(displayName);
            }
        }
    }

    const interviewedCount = interviewed.offer.length + interviewed.active.length + interviewed.rejected.length;
    const noInterviewCount = noInterview.pending.length + noInterview.rejected.length;
    const safeInterviewed = interviewedCount || 1;
    const safeNoInterview = noInterviewCount || 1;

    return {
        totalCompanies,
        interviewedCount,
        noInterviewCount,
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
export const calculateMonthlyVolume = (applications = [], interviews = [], historicalInterviewAppIds = []) => {
    const interviewAppIds = new Set((interviews || []).map(i => i.application_id).filter(Boolean));
    const interviewCompanies = new Set((interviews || []).map(i => (i.company || '').trim().toLowerCase()).filter(Boolean));
    const historicalAppIds = new Set(historicalInterviewAppIds || []);

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
    (applications || []).forEach(a => {
        const isInterviewed = hasAppReachedInterview(a, interviewAppIds, interviewCompanies, historicalAppIds);
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
export const calculateReferralMetrics = (applications = [], interviews = [], historicalInterviewAppIds = []) => {
    const interviewAppIds = new Set((interviews || []).map(i => i.application_id).filter(Boolean));
    const interviewCompanies = new Set((interviews || []).map(i => (i.company || '').trim().toLowerCase()).filter(Boolean));
    const historicalAppIds = new Set(historicalInterviewAppIds || []);

    const isReferralApp = (app) => {
        const ref = (app.REFERAL || app.referal || '').trim();
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

        const reached = hasAppReachedInterview(app, interviewAppIds, interviewCompanies, historicalAppIds);
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
