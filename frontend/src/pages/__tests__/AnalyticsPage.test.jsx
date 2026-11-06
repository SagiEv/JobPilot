import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnalyticsPage from '../AnalyticsPage';
import { useApplications } from '../../hooks/useApplications';
import { useInterviews } from '../../hooks/useInterviews';

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

        // Check overall metric totals (5 unique companies: Google, Stripe, Netflix, Apple, Amazon)
        expect(screen.getByText('5 companies')).toBeInTheDocument();
        expect(screen.getByText('3 companies')).toBeInTheDocument(); // 3 interviewed (Google, Stripe, Netflix)
        expect(screen.getByText('Companies Reached Interview (3)')).toBeInTheDocument();
        expect(screen.getByText('No Interview Reached (2)')).toBeInTheDocument(); // Apple, Amazon

        // Check company chips presence
        expect(screen.getByText('Google')).toBeInTheDocument();
        expect(screen.getByText('Stripe')).toBeInTheDocument();
        expect(screen.getByText('Netflix')).toBeInTheDocument();
        expect(screen.getByText('Apple')).toBeInTheDocument();
        expect(screen.getByText('Amazon')).toBeInTheDocument();

        // Switch to snapshot view
        fireEvent.click(screen.getByText('Current Snapshot (By App)'));
        expect(screen.getByText('Rejection Rate')).toBeInTheDocument();
        expect(screen.getByText('Offer Rate')).toBeInTheDocument();
        expect(screen.getByText('Awaiting Reply')).toBeInTheDocument();
    });
});
