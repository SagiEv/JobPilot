import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InterviewInsightsPage from '../InterviewInsightsPage';
import { useInterviews } from '../../hooks/useInterviews';
import { useApplications } from '../../hooks/useApplications';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmProvider';

vi.mock('../../hooks/useInterviews', () => ({ useInterviews: vi.fn() }));
vi.mock('../../hooks/useApplications', () => ({ useApplications: vi.fn() }));
vi.mock('../../hooks/useSettings', () => ({ useSettings: vi.fn() }));
vi.mock('../../components/ToastProvider', () => ({ useToast: vi.fn() }));
vi.mock('../../components/ConfirmProvider', () => ({ useConfirm: vi.fn() }));
vi.mock('../../components/ProviderBadge', () => ({ default: () => <div data-testid="provider-badge" /> }));

const mockApps = [
    { id: 101, COMPANY: 'Stripe', ROLE_ID: 'Backend Engineer', STATUS: 'Interviewing' },
    { id: 102, COMPANY: 'Figma', ROLE_ID: 'Frontend Engineer', STATUS: 'Applied' }
];

const mockInterviews = [
    {
        id: 1,
        company: 'Stripe',
        date: '2026-06-01',
        keep: ['Strong system design'],
        improve: ['Speak slower'],
        application_id: 101
    }
];

describe('InterviewInsightsPage application linking', () => {
    const mockAddInterview = vi.fn();
    const mockUpdateInterview = vi.fn();
    const mockDeleteInterview = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useApplications.mockReturnValue({ applications: mockApps });
        useSettings.mockReturnValue({ settings: { timezone: 'UTC' } });
        useInterviews.mockReturnValue({
            interviews: mockInterviews,
            loading: false,
            addInterview: mockAddInterview,
            updateInterview: mockUpdateInterview,
            deleteInterview: mockDeleteInterview,
            aiReports: [],
            loadingReports: false,
            generateAiReport: vi.fn(),
            isGeneratingReport: false
        });
        useToast.mockReturnValue({ addToast: vi.fn() });
        useConfirm.mockReturnValue(vi.fn().mockResolvedValue(true));
    });

    it('shows linked application chip on insight card and navigates when clicked', () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        render(<InterviewInsightsPage />);

        const chip = screen.getByText('Stripe — Backend Engineer');
        expect(chip).toBeInTheDocument();

        fireEvent.click(chip);
        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'jobpilot:navigate',
                detail: { tab: 'applications', appId: 101 }
            })
        );
        dispatchSpy.mockRestore();
    });

    it('links an application when creating a new insight and auto-fills company', () => {
        render(<InterviewInsightsPage />);

        fireEvent.click(screen.getByText('+ Add Insights'));

        const appInput = screen.getByLabelText('Link to Application (Optional)');
        fireEvent.focus(appInput);
        fireEvent.change(appInput, { target: { value: 'Figma' } });

        fireEvent.click(screen.getByRole('option', { name: /Figma/i }));

        // Company auto-filled
        expect(screen.getByPlaceholderText('e.g. Google')).toHaveValue('Figma');

        // Fill date and submit
        const dateInput = document.querySelector('input[type="date"]');
        fireEvent.change(dateInput, { target: { value: '2026-06-10' } });

        fireEvent.click(screen.getByText('Save Insights'));

        expect(mockAddInterview).toHaveBeenCalledWith(
            expect.objectContaining({
                company: 'Figma',
                date: '2026-06-10',
                application_id: 102
            })
        );
    });

    it('pre-populates linked application on edit and allows unlinking', () => {
        render(<InterviewInsightsPage />);

        fireEvent.click(screen.getByText('Edit'));

        expect(screen.getByLabelText('Unlink application')).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('Unlink application'));

        fireEvent.click(screen.getByText('Update Insights'));

        expect(mockUpdateInterview).toHaveBeenCalledWith(
            1,
            expect.objectContaining({
                company: 'Stripe',
                application_id: null
            })
        );
    });

    it('highlights target insight card and consumes initialInsightId', () => {
        const onConsumed = vi.fn();
        const { container } = render(
            <InterviewInsightsPage initialInsightId={1} onInitialInsightConsumed={onConsumed} />
        );

        expect(onConsumed).toHaveBeenCalledTimes(1);
        const card = container.querySelector('#insight-card-1');
        expect(card).toHaveClass('insight-card--highlighted');
    });
});
