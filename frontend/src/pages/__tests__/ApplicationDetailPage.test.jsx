import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApplicationDetailPage from '../ApplicationDetailPage';
import { useSettings } from '../../hooks/useSettings';
import { useApplicationHistory } from '../../hooks/useApplicationHistory';
import { useEvents } from '../../hooks/useEvents';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmProvider';

vi.mock('../../hooks/useSettings', () => ({ useSettings: vi.fn() }));
vi.mock('../../hooks/useApplicationHistory', () => ({ useApplicationHistory: vi.fn() }));
vi.mock('../../hooks/useEvents', () => ({ useEvents: vi.fn() }));
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
});
