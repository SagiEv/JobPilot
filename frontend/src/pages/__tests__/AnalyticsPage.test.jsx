import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnalyticsPage from '../AnalyticsPage';
import { useApplications } from '../../hooks/useApplications';

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn().mockReturnValue({ data: {}, isLoading: false })
}));

vi.mock('../../hooks/useApplications', () => ({
    useApplications: vi.fn()
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

    it('renders charts when applications exist', () => {
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
    });
});
