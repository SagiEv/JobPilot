import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnalyticsPage from '../AnalyticsPage';
import { useApplications } from '../../hooks/useApplications';
import { useInterviews } from '../../hooks/useInterviews';
import { useEvents } from '../../hooks/useEvents';

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn().mockReturnValue({
        data: {
            timeToInterview: { averageDays: 12, count: 4 },
            interviewCycle: { averageDays: 24, count: 3 },
            longestInterviewCycle: { days: 45, company: 'Google', role: 'Staff FE', outcome: 'Offer' },
            timeToReject: { averageDays: 7, count: 10 }
        },
        isLoading: false
    })
}));

vi.mock('../../hooks/useApplications', () => ({
    useApplications: vi.fn()
}));

vi.mock('../../hooks/useInterviews', () => ({
    useInterviews: vi.fn().mockReturnValue({ interviews: [], loading: false })
}));

vi.mock('../../hooks/useEvents', () => ({
    useEvents: vi.fn().mockReturnValue({ events: [], loading: false })
}));

// Mock ResizeObserver for Recharts / D3 inside AnalyticsPage
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('AnalyticsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useInterviews.mockReturnValue({ interviews: [], loading: false });
        useEvents.mockReturnValue({ events: [], loading: false });
    });

    it('renders loader when loading', () => {
        useApplications.mockReturnValue({
            applications: [],
            loading: true,
            stats: {}
        });

        render(<AnalyticsPage />);
        expect(screen.getByText('Loading analytics…')).toBeInTheDocument();
    });

    it('renders empty state when no applications', () => {
        useApplications.mockReturnValue({
            applications: [],
            loading: false,
            stats: { total: 0 }
        });

        render(<AnalyticsPage />);
        expect(screen.getByText('No application data yet.')).toBeInTheDocument();
    });

    it('renders charts and redesigned timing cards when applications exist', () => {
        useApplications.mockReturnValue({
            applications: [
                { id: '1', COMPANY: 'Google', ROLE_ID: 'Frontend', STATUS: 'Applied', DATE: '2023-01-01' },
                { id: '2', COMPANY: 'Meta', ROLE_ID: 'Backend', STATUS: 'Rejected', DATE: '2023-01-02' }
            ],
            loading: false,
            stats: { total: 2, active: 1 }
        });

        render(<AnalyticsPage />);
        
        // Check for section headers
        expect(screen.getByText('Conversion Funnel')).toBeInTheDocument();
        expect(screen.getByText('Monthly Volume')).toBeInTheDocument();

        // Check for timing KPI cards
        expect(screen.getByText('Time to 1st Interview')).toBeInTheDocument();
        expect(screen.getByText('Avg. Interview Cycle')).toBeInTheDocument();
        expect(screen.getByText('Longest Interview Cycle')).toBeInTheDocument();
        expect(screen.getByText('Interviewed This Year')).toBeInTheDocument();

        // Check for monthly legend
        expect(screen.getByText('Applications Applied')).toBeInTheDocument();
        expect(screen.getByText('Companies Interviewed')).toBeInTheDocument();
    });

    it('renders overall company funnel with deduplication and interview outcomes', () => {
        useApplications.mockReturnValue({
            applications: [
                // Google: 2 apps, 1 reached interview and is still interviewing
                { id: '1', COMPANY: 'Google', ROLE_ID: 'FE', STATUS: 'Interviewing', STAGE: 'Technical Interview', DATE: '2023-01-01' },
                { id: '2', COMPANY: 'Google', ROLE_ID: 'BE', STATUS: 'Rejected', STAGE: '', DATE: '2023-01-02' },
                // Stripe: reached interview, got rejected after interview
                { id: '3', COMPANY: 'Stripe', ROLE_ID: 'FS', STATUS: 'Rejected', STAGE: 'Recruiter / HR Screen', DATE: '2023-01-03' },
                // Netflix: reached offer
                { id: '4', COMPANY: 'Netflix', ROLE_ID: 'Mobile', STATUS: 'Offer', STAGE: 'Final', DATE: '2023-01-04' },
                // Apple: rejected at screening
                { id: '5', COMPANY: 'Apple', ROLE_ID: 'iOS', STATUS: 'Rejected', STAGE: '', DATE: '2023-01-05' },
                // Amazon: awaiting reply
                { id: '6', COMPANY: 'Amazon', ROLE_ID: 'DevOps', STATUS: 'Applied', STAGE: '', DATE: '2023-01-06' }
            ],
            loading: false,
            stats: { total: 6, active: 3 }
        });

        render(<AnalyticsPage />);

        // Toggles are visible
        expect(screen.getByText('Overall (By Company)')).toBeInTheDocument();
        expect(screen.getByText('Current Snapshot (By App)')).toBeInTheDocument();

        // Default is Snapshot view
        expect(screen.getByRole('button', { name: /Current Snapshot/i })).toHaveClass('active');
        expect(screen.queryByText('Current status snapshot across all submitted applications')).not.toBeInTheDocument();
        expect(screen.getByText('Offer Rate')).toBeInTheDocument();

        // Switch to overall company view
        fireEvent.click(screen.getByText('Overall (By Company)'));

        // Check overall metric totals (5 unique companies: Google, Stripe, Netflix, Apple, Amazon)
        expect(screen.getByText('Companies Reached Interview (3)')).toBeInTheDocument();
        expect(screen.getByText('No Interview Reached (2)')).toBeInTheDocument(); // Apple, Amazon
        expect(screen.getByText('Ghosted Rate')).toBeInTheDocument();
        expect(screen.getByText('👻 Ghosted')).toBeInTheDocument();

        // Check interviewed company chips presence
        expect(screen.getByText('Google')).toBeInTheDocument();
        expect(screen.getByText('Stripe')).toBeInTheDocument();
        expect(screen.getByText('Netflix')).toBeInTheDocument();

        // In 'no interview reached', company names are NOT shown at all
        expect(screen.queryByText('Apple')).not.toBeInTheDocument();
        expect(screen.queryByText('Amazon')).not.toBeInTheDocument();
    });
    it('renders referral impact metrics with cohorts and application chips', () => {
        useApplications.mockReturnValue({
            applications: [
                { id: '1', COMPANY: 'Google', ROLE_ID: 'FE Lead', STATUS: 'Interviewing', STAGE: 'Technical Interview', REFERAL: 'Jane Doe', DATE: '2023-01-01', fit_analysis_ai: { ai_score: 90 } },
                { id: '2', COMPANY: 'Google', ROLE_ID: 'BE Senior', STATUS: 'Rejected', STAGE: '', REFERAL: '', DATE: '2023-01-02', fit_score_deterministic: 70 },
                { id: '3', COMPANY: 'Meta', ROLE_ID: 'Staff Eng', STATUS: 'Rejected', STAGE: 'Recruiter / HR Screen', REFERAL: '', DATE: '2023-01-03', fit_score_deterministic: 85 },
                { id: '4', COMPANY: 'Stripe', ROLE_ID: 'Tech Lead', STATUS: 'Offer', STAGE: 'Final', REFERAL: 'John Smith', DATE: '2023-01-04', fit_score_deterministic: 95 }
            ],
            loading: false,
            stats: { total: 4, active: 2 }
        });

        render(<AnalyticsPage />);

        expect(screen.getByText('Referral Impact')).toBeInTheDocument();
        expect(screen.getByText('Referred Interview Share')).toBeInTheDocument();
        expect(screen.getByText('Interview Rate (Ref vs Direct)')).toBeInTheDocument();
        expect(screen.getByText('Referral Advantage')).toBeInTheDocument();

        // Cohort headers
        expect(screen.getByText(/With Referral \(2 applications\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Direct \/ No Referral \(1 applications\)/i)).toBeInTheDocument();

        // Application chips (Company • Role)
        expect(screen.getByText('Google • FE Lead')).toBeInTheDocument();
        expect(screen.getByText('Stripe • Tech Lead')).toBeInTheDocument();
        expect(screen.getByText('Meta • Staff Eng')).toBeInTheDocument();
    });
});
