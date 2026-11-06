import { describe, it, expect } from 'vitest';
import { calculateCompanyFunnelMetrics, hasAppReachedInterview } from '../analyticsCalculations';

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

            // 42 had an interview in history transitions
            const res = calculateCompanyFunnelMetrics(apps, [], [42]);
            expect(res.totalCompanies).toBe(1);
            expect(res.interviewedCount).toBe(1);
            expect(res.interviewRate).toBe(100);
            expect(res.interviewed.rejected.count).toBe(1);
            expect(res.interviewed.rejected.companies).toEqual(['Uber']);
        });

        it('correctly tracks post-interview rejection vs pre-interview rejection', () => {
            const apps = [
                // Reached interview, then rejected
                { id: 1, COMPANY: 'Meta', STATUS: 'Rejected', STAGE: 'HR Screen' },
                // Rejected without interview
                { id: 2, COMPANY: 'Apple', STATUS: 'Rejected', STAGE: '' },
                // Interviewed and got offer
                { id: 3, COMPANY: 'Stripe', STATUS: 'Offer', STAGE: 'Final' },
                // Still waiting
                { id: 4, COMPANY: 'Amazon', STATUS: 'Applied', STAGE: '' }
            ];

            const res = calculateCompanyFunnelMetrics(apps, []);
            expect(res.totalCompanies).toBe(4);
            expect(res.interviewedCount).toBe(2); // Meta & Stripe
            expect(res.interviewRate).toBe(50.0);

            // Interviewed outcomes
            expect(res.interviewed.offer.count).toBe(1);
            expect(res.interviewed.offer.companies).toEqual(['Stripe']);
            expect(res.interviewed.rejected.count).toBe(1);
            expect(res.interviewed.rejected.companies).toEqual(['Meta']);

            // Non-interview outcomes
            expect(res.noInterview.pending.count).toBe(1);
            expect(res.noInterview.pending.companies).toEqual(['Amazon']);
            expect(res.noInterview.rejected.count).toBe(1);
            expect(res.noInterview.rejected.companies).toEqual(['Apple']);
        });
    });
});
