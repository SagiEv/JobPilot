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

