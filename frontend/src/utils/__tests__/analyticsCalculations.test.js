import { describe, it, expect } from 'vitest';
import {
    calculateCompanyFunnelMetrics,
    hasAppReachedInterview,
    calculateMonthlyVolume,
    calculateReferralMetrics
} from '../analyticsCalculations';

describe('analyticsCalculations', () => {
    describe('hasAppReachedInterview', () => {
        it('returns true when status includes interview', () => {
            expect(hasAppReachedInterview({ STATUS: 'Interviewing' })).toBe(true);
        });

        it('returns true when status is offer or hired', () => {
            expect(hasAppReachedInterview({ STATUS: 'Offer' })).toBe(true);
            expect(hasAppReachedInterview({ STATUS: 'Hired' })).toBe(true);
        });

        it('returns true when stage is an interview stage even if rejected', () => {
            expect(hasAppReachedInterview({ STATUS: 'Rejected', STAGE: 'Technical Interview' })).toBe(true);
        });

        it('returns true if application ID is in interviewAppIds', () => {
            const appIds = new Set([101]);
            expect(hasAppReachedInterview({ id: 101, STATUS: 'Rejected' }, appIds)).toBe(true);
        });

        it('returns true if application ID is in historicalAppIds', () => {
            const historyAppIds = new Set([202]);
            expect(hasAppReachedInterview({ id: 202, STATUS: 'Rejected', STAGE: '' }, null, null, historyAppIds)).toBe(true);
        });

        it('returns true if company is in interviewCompanies', () => {
            const companies = new Set(['google']);
            expect(hasAppReachedInterview({ COMPANY: 'Google', STATUS: 'Rejected' }, null, companies)).toBe(true);
        });

        it('returns false for plain applied or rejected without interview', () => {
            expect(hasAppReachedInterview({ STATUS: 'Applied' })).toBe(false);
            expect(hasAppReachedInterview({ STATUS: 'Rejected', STAGE: '' })).toBe(false);
            expect(hasAppReachedInterview({ STATUS: 'Rejected', STAGE: 'Applied' })).toBe(false);
        });
    });

    describe('calculateCompanyFunnelMetrics', () => {
        it('handles empty applications cleanly', () => {
            const res = calculateCompanyFunnelMetrics([], []);
            expect(res.totalCompanies).toBe(0);
            expect(res.interviewedCount).toBe(0);
            expect(res.interviewRate).toBe(0);
        });

        it('deduplicates multiple applications to the same company', () => {
            const apps = [
                { id: 1, COMPANY: 'Google', STATUS: 'Rejected', STAGE: '' },
                { id: 2, COMPANY: 'Google', STATUS: 'Interviewing', STAGE: 'Technical Interview' },
                { id: 3, COMPANY: 'Google', STATUS: 'Applied', STAGE: '' }
            ];

            const res = calculateCompanyFunnelMetrics(apps, []);
            expect(res.totalCompanies).toBe(1);
            expect(res.interviewedCount).toBe(1);
            expect(res.interviewRate).toBe(100);
            expect(res.interviewed.active.count).toBe(1);
            expect(res.interviewed.active.companies).toEqual(['Google']);
        });

        it('identifies interview from historicalInterviewAppIds even if STAGE is blank', () => {
            const apps = [
                { id: 42, COMPANY: 'Uber', STATUS: 'Rejected', STAGE: '' }
            ];

            const res = calculateCompanyFunnelMetrics(apps, [], [42]);
            expect(res.totalCompanies).toBe(1);
            expect(res.interviewedCount).toBe(1);
            expect(res.interviewRate).toBe(100);
            expect(res.interviewed.rejected.count).toBe(1);
            expect(res.interviewed.rejected.companies).toEqual(['Uber']);
        });

        it('correctly tracks post-interview rejection vs pre-interview rejection', () => {
            const apps = [
                { id: 1, COMPANY: 'Meta', STATUS: 'Rejected', STAGE: 'HR Screen' },
                { id: 2, COMPANY: 'Apple', STATUS: 'Rejected', STAGE: '' },
                { id: 3, COMPANY: 'Stripe', STATUS: 'Offer', STAGE: 'Final' },
                { id: 4, COMPANY: 'Amazon', STATUS: 'Applied', STAGE: '' }
            ];

            const res = calculateCompanyFunnelMetrics(apps, []);
            expect(res.totalCompanies).toBe(4);
            expect(res.interviewedCount).toBe(2);
            expect(res.interviewRate).toBe(50.0);
            expect(res.interviewed.offer.count).toBe(1);
            expect(res.interviewed.offer.companies).toEqual(['Stripe']);
            expect(res.interviewed.rejected.count).toBe(1);
            expect(res.interviewed.rejected.companies).toEqual(['Meta']);
            expect(res.noInterview.pending.count).toBe(1);
            expect(res.noInterview.pending.companies).toEqual(['Amazon']);
            expect(res.noInterview.rejected.count).toBe(1);
            expect(res.noInterview.rejected.companies).toEqual(['Apple']);
        });
    });

    describe('calculateMonthlyVolume', () => {
        it('handles empty inputs cleanly', () => {
            const res = calculateMonthlyVolume([], [], []);
            expect(res.months).toEqual([]);
            expect(res.maxVolume).toBe(1);
            expect(res.companiesInterviewedThisYear).toBe(0);
        });

        it('deduplicates multiple interviews for the same company in the same month', () => {
            const year = new Date().getFullYear();
            const monthStr = `${year}-05`;

            const apps = [
                { id: 1, COMPANY: 'Google', DATE: `${monthStr}-01`, STATUS: 'Interviewing', STAGE: 'Tech' },
                { id: 2, COMPANY: 'Google', DATE: `${monthStr}-02`, STATUS: 'Interviewing', STAGE: 'Tech' },
                { id: 3, COMPANY: 'Microsoft', DATE: `${monthStr}-10`, STATUS: 'Applied', STAGE: '' }
            ];

            const interviews = [
                { company: 'Google', date: `${monthStr}-05`, application_id: 1 },
                { company: 'Google', date: `${monthStr}-12`, application_id: 1 },
                { company: 'Google', date: `${monthStr}-20`, application_id: 2 }
            ];

            const res = calculateMonthlyVolume(apps, interviews, []);
            expect(res.months).toContain(monthStr);
            expect(res.monthlyApplied[monthStr]).toBe(3);
            expect(res.monthlyInterviewCounts[monthStr]).toBe(1);
            expect(res.monthlyInterviewCompanies[monthStr]).toEqual(['Google']);
            expect(res.companiesInterviewedThisYear).toBe(1);
        });
    });

    describe('calculateReferralMetrics', () => {
        it('handles empty applications cleanly', () => {
            const res = calculateReferralMetrics([], [], []);
            expect(res.hasData).toBe(false);
            expect(res.totalReferredCount).toBe(0);
            expect(res.totalDirectCount).toBe(0);
            expect(res.totalInterviewedApps).toBe(0);
        });

        it('correctly compares applications with referral vs direct on the application level', () => {
            const apps = [
                // Google App 1: Referred, reached interview and got offer
                { id: 1, COMPANY: 'Google', ROLE_ID: 'FE Lead', REFERAL: 'John Doe', STATUS: 'Offer', STAGE: 'Final', fit_score_deterministic: 85 },
                // Google App 2: Direct, rejected at screening (no interview)
                { id: 2, COMPANY: 'Google', ROLE_ID: 'Backend', REFERAL: '', STATUS: 'Rejected', STAGE: '', fit_score_deterministic: 70 },
                // Stripe: Referred, still interviewing
                { id: 3, COMPANY: 'Stripe', ROLE_ID: 'Fullstack', REFERAL: 'Alice', STATUS: 'Interviewing', STAGE: 'Technical', fit_score_deterministic: 90 },
                // Meta: Direct, reached interview and rejected post-interview
                { id: 4, COMPANY: 'Meta', ROLE_ID: 'Infra', REFERAL: 'None', STATUS: 'Rejected', STAGE: 'HR Screen', fit_score_deterministic: 80 },
                // Apple: Direct, applied pending
                { id: 5, COMPANY: 'Apple', ROLE_ID: 'iOS', REFERAL: '', STATUS: 'Applied', STAGE: '', fit_score_deterministic: 60 }
            ];

            const res = calculateReferralMetrics(apps, [], []);
            expect(res.hasData).toBe(true);
            expect(res.totalReferredCount).toBe(2); // Apps 1 & 3
            expect(res.totalDirectCount).toBe(3);   // Apps 2, 4, 5

            // Interviewed applications: 3 apps total (App 1 Google, App 3 Stripe, App 4 Meta)
            expect(res.totalInterviewedApps).toBe(3);

            // Referred interview apps: 2 (Google FE Lead, Stripe Fullstack)
            expect(res.referred.interviewApps.length).toBe(2);
            expect(res.referred.interviewApps.map(a => a.label)).toEqual(['Google • FE Lead', 'Stripe • Fullstack']);
            expect(res.refInterviewRate).toBe(100.0); // 2/2 = 100%
            expect(res.referred.outcomes.offers.count).toBe(1);
            expect(res.referred.outcomes.active.count).toBe(1);
            expect(res.referred.avgFit).toBe(88); // (85 + 90) / 2 = 87.5 -> 88

            // Direct interview apps: 1 (Meta Infra)
            expect(res.direct.interviewApps.length).toBe(1);
            expect(res.direct.interviewApps[0].label).toBe('Meta • Infra');
            expect(res.directInterviewRate).toBe(33.3); // 1/3 = 33.3%
            expect(res.direct.outcomes.rejected.count).toBe(1);
            expect(res.direct.avgFit).toBe(80);

            // Shares of interviewed applications
            expect(res.refShareOfInterviews).toBe(66.7); // 2/3
            expect(res.directShareOfInterviews).toBe(33.3); // 1/3

            // Lift: 100 / 33.3 = 3.0x
            expect(res.lift).toBe(3.0);
        });
    });
});
