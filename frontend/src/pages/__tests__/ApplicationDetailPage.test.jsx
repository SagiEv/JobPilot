import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApplicationDetailPage from '../ApplicationDetailPage';
import { useSettings } from '../../hooks/useSettings';
import { useApplicationHistory } from '../../hooks/useApplicationHistory';
import { useEvents } from '../../hooks/useEvents';
import { useInterviews } from '../../hooks/useInterviews';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmProvider';

vi.mock('../../hooks/useSettings', () => ({ useSettings: vi.fn() }));
vi.mock('../../hooks/useApplicationHistory', () => ({ useApplicationHistory: vi.fn() }));
vi.mock('../../hooks/useEvents', () => ({ useEvents: vi.fn() }));
vi.mock('../../hooks/useInterviews', () => ({ useInterviews: vi.fn() }));
vi.mock('../../components/ToastProvider', () => ({ useToast: vi.fn() }));
vi.mock('../../components/ConfirmProvider', () => ({ useConfirm: vi.fn() }));

const mockApp = {
    id: '1',
    COMPANY: 'Google',
    ROLE_ID: 'Frontend',
    STATUS: 'Applied',
    STAGE: '',
    LINK: 'google.com/jobs',
    INFO: 'Nice job',
    DATE: '2023-01-01',
    LOCATION: 'Remote',
    REFERAL: 'John Doe',
    CV_FILE: 'resume.pdf'
};

describe('ApplicationDetailPage', () => {
    const mockOnBack = vi.fn();
    const mockOnUpdate = vi.fn();
    const mockAddNote = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useSettings.mockReturnValue({ settings: { timezone: 'UTC' } });
        useApplicationHistory.mockReturnValue({ history: [], isLoading: false, addNote: mockAddNote });
        useEvents.mockReturnValue({ events: [] });
        useInterviews.mockReturnValue({ interviews: [] });
        useToast.mockReturnValue({ addToast: vi.fn() });
        useConfirm.mockReturnValue(vi.fn());
    });

    it('renders application details correctly', () => {
        render(<ApplicationDetailPage app={mockApp} onBack={mockOnBack} onUpdate={mockOnUpdate} />);
        
        expect(screen.getByText('Google')).toBeInTheDocument();
        expect(screen.getByText('Frontend')).toBeInTheDocument();
        expect(screen.getByText('Remote')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Nice job')).toBeInTheDocument();
    });

    it('enters edit mode and updates status', () => {
        render(<ApplicationDetailPage app={mockApp} onBack={mockOnBack} onUpdate={mockOnUpdate} />);
        
        // Enter edit mode
        const editButton = screen.getByText('✏ Update');
        fireEvent.click(editButton);
        
        // Change status to Interviewing
        const statusSelect = screen.getByDisplayValue('Applied');
        fireEvent.change(statusSelect, { target: { value: 'Interviewing' } });
        
        // Confirm change
        const confirmButton = screen.getByText('Confirm');
        fireEvent.click(confirmButton);
        
        // Check if onUpdate was called with new status
        expect(mockOnUpdate).toHaveBeenCalledWith(
            '1', 'Interviewing', '', expect.any(String), undefined, undefined, '', ''
        );
    });

    it('adds a note successfully', () => {
        render(<ApplicationDetailPage app={mockApp} onBack={mockOnBack} onUpdate={mockOnUpdate} />);
        
        // Open activity log
        const activityLogHeader = screen.getByText('Activity Log');
        fireEvent.click(activityLogHeader);
        
        // Add note
        const noteInput = screen.getByPlaceholderText('Add a note...');
        fireEvent.change(noteInput, { target: { value: 'Called recruiter' } });
        
        const addButton = screen.getByText('Add Note');
        fireEvent.click(addButton);
        
        expect(mockAddNote).toHaveBeenCalledWith('Called recruiter', '');
    });

    it('renders quick reject button for active applications and submits rejection via modal', () => {
        render(<ApplicationDetailPage app={mockApp} onBack={mockOnBack} onUpdate={mockOnUpdate} />);

        const quickRejectBtn = screen.getByTitle('Quick Reject');
        expect(quickRejectBtn).toBeInTheDocument();

        fireEvent.click(quickRejectBtn);

        expect(screen.getByText('Reject Application: Google')).toBeInTheDocument();

        const reasonInput = screen.getByPlaceholderText('e.g. They went with an internal candidate');
        fireEvent.change(reasonInput, { target: { value: 'Position closed' } });

        const autoRejectCheck = screen.getByLabelText(/Automatically rejected/);
        fireEvent.click(autoRejectCheck);

        const confirmBtn = screen.getByText('Confirm Rejection');
        fireEvent.click(confirmBtn);

        expect(mockOnUpdate).toHaveBeenCalledWith(
            '1',
            'Rejected',
            '',
            expect.any(String),
            'Position closed',
            true
        );
    });

    it('submits rejection modal with custom date when changed by user', () => {
        render(<ApplicationDetailPage app={mockApp} onBack={mockOnBack} onUpdate={mockOnUpdate} />);

        const quickRejectBtn = screen.getByTitle('Quick Reject');
        fireEvent.click(quickRejectBtn);

        const dateInput = screen.getByLabelText('Date');
        fireEvent.change(dateInput, { target: { value: '2026-05-15' } });

        const confirmBtn = screen.getByText('Confirm Rejection');
        fireEvent.click(confirmBtn);

        expect(mockOnUpdate).toHaveBeenCalledWith(
            '1',
            'Rejected',
            '',
            '2026-05-15',
            '',
            false
        );
    });

    it('does not render quick reject button for already rejected, ignored, or withdrawn applications', () => {
        const rejectedApp = { ...mockApp, STATUS: 'Rejected' };
        const { rerender } = render(<ApplicationDetailPage app={rejectedApp} onBack={mockOnBack} onUpdate={mockOnUpdate} />);
        expect(screen.queryByTitle('Quick Reject')).not.toBeInTheDocument();

        const ignoredApp = { ...mockApp, STATUS: 'Ignored' };
        rerender(<ApplicationDetailPage app={ignoredApp} onBack={mockOnBack} onUpdate={mockOnUpdate} />);
        expect(screen.queryByTitle('Quick Reject')).not.toBeInTheDocument();

        const withdrawnApp = { ...mockApp, STATUS: 'Withdrawn' };
        rerender(<ApplicationDetailPage app={withdrawnApp} onBack={mockOnBack} onUpdate={mockOnUpdate} />);
        expect(screen.queryByTitle('Quick Reject')).not.toBeInTheDocument();
    });

    it('renders sticky bottom ghosting suggestion bar for stale active apps and hides it for withdrawn apps', () => {
        const staleApp = { ...mockApp, STATUS: 'Applied', LAST_ACTIVITY_DATE: '2020-01-01' };
        const { container, rerender } = render(
            <ApplicationDetailPage app={staleApp} onBack={mockOnBack} onUpdate={mockOnUpdate} />
        );

        const stickyBar = container.querySelector('.adp-ghosting-bar');
        expect(stickyBar).toBeInTheDocument();
        expect(stickyBar).toHaveTextContent('No updates in a while');

        const staleWithdrawnApp = { ...staleApp, STATUS: 'Withdrawn' };
        rerender(<ApplicationDetailPage app={staleWithdrawnApp} onBack={mockOnBack} onUpdate={mockOnUpdate} />);
        expect(container.querySelector('.adp-ghosting-bar')).not.toBeInTheDocument();
    });

    it('renders custom backLabel when provided', () => {
        render(<ApplicationDetailPage app={mockApp} onBack={mockOnBack} onUpdate={mockOnUpdate} backLabel="Back to Dashboard" />);
        expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
    });

    it('preserves newlines in notes and sets rtl/ltr direction by majority language', () => {
        useApplicationHistory.mockReturnValue({
            history: [
                {
                    id: 'note-he',
                    event_type: 'Note',
                    event_date: '2026-06-01',
                    notes: 'HR: שיחה טובה\nשלב הבא ראיון טכני'
                },
                {
                    id: 'note-en',
                    event_type: 'Note',
                    event_date: '2026-06-02',
                    notes: 'Line one\nLine two with details'
                }
            ],
            isLoading: false,
            addNote: mockAddNote
        });

        render(<ApplicationDetailPage app={mockApp} onBack={mockOnBack} onUpdate={mockOnUpdate} />);

        fireEvent.click(screen.getByText('Activity Log'));

        const heNoteEl = screen.getByText(/HR: שיחה טובה/);
        expect(heNoteEl).toHaveAttribute('dir', 'rtl');
        expect(heNoteEl).toHaveStyle({ whiteSpace: 'pre-wrap', textAlign: 'right' });

        const enNoteEl = screen.getByText(/Line one/);
        expect(enNoteEl).toHaveAttribute('dir', 'ltr');
        expect(enNoteEl).toHaveStyle({ whiteSpace: 'pre-wrap', textAlign: 'left' });

        // Note input is a multiline textarea supporting newlines and dynamic dir
        const noteTextarea = screen.getByPlaceholderText('Add a note...');
        expect(noteTextarea.tagName).toBe('TEXTAREA');
        fireEvent.change(noteTextarea, { target: { value: 'שורה ראשונה\nשורה שנייה' } });
        expect(noteTextarea).toHaveAttribute('dir', 'rtl');

        fireEvent.click(screen.getByText('Add Note'));
        expect(mockAddNote).toHaveBeenCalledWith('שורה ראשונה\nשורה שנייה', '');
    });

    it('opens reject modal when selecting Rejected in the edit mode dropdown', () => {
        render(<ApplicationDetailPage app={mockApp} onBack={mockOnBack} onUpdate={mockOnUpdate} />);

        fireEvent.click(screen.getByText('✏ Update'));

        const statusSelect = screen.getByDisplayValue('Applied');
        fireEvent.change(statusSelect, { target: { value: 'Rejected' } });

        expect(screen.getByText('Reject Application: Google')).toBeInTheDocument();
    });

    it('shows View Insight button when linked insights exist and navigates to insights page', () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        const { rerender } = render(<ApplicationDetailPage app={mockApp} onBack={mockOnBack} onUpdate={mockOnUpdate} />);
        expect(screen.queryByText(/View Insight/)).not.toBeInTheDocument();

        useInterviews.mockReturnValue({
            interviews: [{ id: 77, company: 'Google', application_id: 1 }]
        });
        rerender(<ApplicationDetailPage app={mockApp} onBack={mockOnBack} onUpdate={mockOnUpdate} />);

        const btn = screen.getByText('View Insight');
        expect(btn).toBeInTheDocument();
        fireEvent.click(btn);

        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'jobpilot:navigate',
                detail: { tab: 'interview', insightId: 77 }
            })
        );
        dispatchSpy.mockRestore();
    });
});
