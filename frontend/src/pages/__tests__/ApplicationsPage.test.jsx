import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApplicationsPage from '../ApplicationsPage';
import { useApplications } from '../../hooks/useApplications';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmProvider';

vi.mock('../../hooks/useApplications', () => ({
    useApplications: vi.fn()
}));

vi.mock('../../hooks/useSettings', () => ({
    useSettings: vi.fn()
}));

vi.mock('../../components/ToastProvider', () => ({
    useToast: vi.fn()
}));

vi.mock('../../components/ConfirmProvider', () => ({
    useConfirm: vi.fn()
}));

describe('ApplicationsPage', () => {
    const mockUpdateApplication = vi.fn();
    const mockAddApplication = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        
        useToast.mockReturnValue({ addToast: vi.fn() });
        useConfirm.mockReturnValue(vi.fn());
        useSettings.mockReturnValue({ settings: { timezone: 'UTC' } });
        
        useApplications.mockReturnValue({
            applications: [],
            stats: { active: 0, interview: 0, total: 0 },
            loading: false,
            updateApplication: mockUpdateApplication,
            addApplication: mockAddApplication,
            dismissedGhostings: {},
            dismissGhosting: vi.fn()
        });
    });

    it('renders loader when loading', () => {
        useApplications.mockReturnValue({
            applications: [],
            stats: { active: 0, interview: 0, total: 0 },
            loading: true
        });

        render(<ApplicationsPage />);
        expect(screen.getByText('Loading applications…')).toBeInTheDocument();
    });

    it('renders applications table', () => {
        useApplications.mockReturnValue({
            applications: [
                { id: '1', COMPANY: 'Google', ROLE_ID: 'Frontend', STATUS: 'Applied', DATE: '2023-01-01' }
            ],
            stats: { active: 1, interview: 0, total: 1 },
            loading: false,
            dismissedGhostings: {}
        });

        render(<ApplicationsPage />);
        expect(screen.getByText('Google')).toBeInTheDocument();
        expect(screen.getByText('Frontend')).toBeInTheDocument();
    });

    it('opens add application modal', () => {
        render(<ApplicationsPage />);
        
        const newAppButton = screen.getByText('+ New Application');
        fireEvent.click(newAppButton);

        expect(screen.getByText('New Application')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('e.g. Google')).toBeInTheDocument();
    });

    it('filters applications based on search term', () => {
        useApplications.mockReturnValue({
            applications: [
                { id: '1', COMPANY: 'Google', ROLE_ID: 'Frontend', STATUS: 'Applied' },
                { id: '2', COMPANY: 'Meta', ROLE_ID: 'Backend', STATUS: 'Applied' }
            ],
            stats: { active: 2, interview: 0, total: 2 },
            loading: false,
            dismissedGhostings: {}
        });

        render(<ApplicationsPage />);
        
        const searchInput = screen.getByPlaceholderText('Search company or role...');
        fireEvent.change(searchInput, { target: { value: 'Meta' } });

        expect(screen.getByText('Meta')).toBeInTheDocument();
        expect(screen.queryByText('Google')).not.toBeInTheDocument();
    });
});
