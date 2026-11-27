import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPage from '../DashboardPage';
import { useApplications } from '../../hooks/useApplications';
import { useDailyStats } from '../../hooks/useDailyStats';
import { useEvents } from '../../hooks/useEvents';
import { useNotifications } from '../../hooks/useNotifications';
import { useRss } from '../../hooks/useRss';
import { useScrapedJobs } from '../../hooks/useScrapedJobs';
import { useSettings } from '../../hooks/useSettings';
import { useApplicationHistory } from '../../hooks/useApplicationHistory';
import { useInterviews } from '../../hooks/useInterviews';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmProvider';

vi.mock('../../hooks/useApplications', () => ({ useApplications: vi.fn() }));
vi.mock('../../hooks/useDailyStats', () => ({ useDailyStats: vi.fn() }));
vi.mock('../../hooks/useEvents', () => ({ useEvents: vi.fn() }));
vi.mock('../../hooks/useNotifications', () => ({ useNotifications: vi.fn() }));
vi.mock('../../hooks/useRss', () => ({ useRss: vi.fn() }));
vi.mock('../../hooks/useScrapedJobs', () => ({ useScrapedJobs: vi.fn() }));
vi.mock('../../hooks/useSettings', () => ({ useSettings: vi.fn() }));
vi.mock('../../hooks/useApplicationHistory', () => ({ useApplicationHistory: vi.fn() }));
vi.mock('../../hooks/useInterviews', () => ({ useInterviews: vi.fn() }));
vi.mock('../../components/ToastProvider', () => ({ useToast: vi.fn() }));
vi.mock('../../components/ConfirmProvider', () => ({ useConfirm: vi.fn() }));
vi.mock('../../components/ProviderBadge', () => ({ default: () => <div /> }));
vi.mock('../../components/RoleFitAnalysis', () => ({ default: () => <div /> }));

const mockApps = [
    { id: 1, COMPANY: 'Stripe', ROLE_ID: 'Backend Engineer', STATUS: 'Interviewing', STAGE: 'Technical Interview', DATE: '2026-06-10', INFO: 'Payments team' },
    { id: 2, COMPANY: 'Linear', ROLE_ID: 'Product Engineer', STATUS: 'Applied', STAGE: '', DATE: '2026-06-08', INFO: 'Issue tracking' }
];

describe('DashboardPage quick application search', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useApplications.mockReturnValue({
            applications: mockApps,
            loading: false,
            updateApplication: vi.fn(),
            conflict: null,
            handleConflictResolution: vi.fn(),
            dismissedGhostings: {},
            dismissGhosting: vi.fn()
        });
        useDailyStats.mockReturnValue({ data: { appliedToday: 3, rejectedToday: 1 } });
        useEvents.mockReturnValue({ events: [], loading: false, addEvent: vi.fn() });
        useNotifications.mockReturnValue({
            notifications: [],
            isLoading: false,
            markAllRead: vi.fn(),
            markRead: vi.fn(),
            revertNotification: vi.fn(),
            unrevertNotification: vi.fn()
        });
        useRss.mockReturnValue({ jobs: [], jobsLoading: false });
        useScrapedJobs.mockReturnValue({
            scrapedJobs: [],
            loading: false,
            toggleBookmark: vi.fn(),
            markAsSeen: vi.fn(),
            removeJob: vi.fn()
        });
        useSettings.mockReturnValue({ settings: { timezone: 'UTC' } });
        useApplicationHistory.mockReturnValue({ history: [], isLoading: false, addNote: vi.fn() });
        useInterviews.mockReturnValue({ interviews: [] });
        useToast.mockReturnValue({ addToast: vi.fn(), removeToast: vi.fn() });
        useConfirm.mockReturnValue(vi.fn());
    });

    it('renders quick search bar in header between welcome text and daily stats', () => {
        const { container } = render(<DashboardPage />);
        const header = container.querySelector('.dashboard-header');
        expect(header).toBeInTheDocument();
        expect(header.children).toHaveLength(3);
        expect(header.children[0]).toHaveTextContent('Welcome back, Job Hunter!');
        expect(header.children[1]).toHaveClass('dashboard-quick-search');
        expect(header.children[2]).toHaveTextContent('Applied Today');
        expect(header.children[2]).toHaveTextContent('Rejected Today');
    });

    it('filters applications and opens detail view with Back to Dashboard button', () => {
        render(<DashboardPage />);

        const searchInput = screen.getByLabelText('Quick search applications');
        fireEvent.focus(searchInput);
        fireEvent.change(searchInput, { target: { value: 'Stripe' } });

        expect(screen.getByRole('option', { name: /Stripe/i })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: /Linear/i })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('option', { name: /Stripe/i }));

        // Opened ApplicationDetailPage in-place
        expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Payments team')).toBeInTheDocument();

        // Return to Dashboard
        fireEvent.click(screen.getByText('Back to Dashboard'));
        expect(screen.getByText('Welcome back, Job Hunter!')).toBeInTheDocument();
    });

    it('renders dashboard layout progressively without full-page PageLoader while loading', () => {
        useApplications.mockReturnValue({
            applications: [],
            loading: true,
            updateApplication: vi.fn(),
            conflict: null,
            handleConflictResolution: vi.fn(),
            dismissedGhostings: {},
            dismissGhosting: vi.fn()
        });
        useEvents.mockReturnValue({ events: [], loading: true, addEvent: vi.fn() });

        render(<DashboardPage />);

        expect(screen.getByText('Welcome back, Job Hunter!')).toBeInTheDocument();
        expect(screen.getByText('Loading interviews…')).toBeInTheDocument();
    });
});
