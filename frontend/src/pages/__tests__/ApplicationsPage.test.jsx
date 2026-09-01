import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApplicationsPage from '../ApplicationsPage';
import { renderWithProviders } from '../../test-utils';

vi.mock('../../hooks/useSettings', () => ({
    useSettings: () => ({ settings: { timezone: 'UTC' } })
}));

describe('ApplicationsPage Integration Test', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loader initially, then displays applications from API', async () => {
        renderWithProviders(<ApplicationsPage />);
        expect(screen.getByText('Loading applications…')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.getByText('Google')).toBeInTheDocument();
        });
        expect(screen.getByText('Frontend')).toBeInTheDocument();
    });

    it('can open New Application modal, submit, and display error if invalid hook is present', async () => {
        renderWithProviders(<ApplicationsPage />);
        
        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText('Google')).toBeInTheDocument();
        });

        // Open modal
        const newAppButton = screen.getByText('+ New Application');
        fireEvent.click(newAppButton);

        expect(screen.getByText('New Application')).toBeInTheDocument();

        // Fill form
        const companyInput = screen.getByPlaceholderText('e.g. Google');
        const roleInput = screen.getByPlaceholderText('e.g. Frontend Engineer');

        fireEvent.change(companyInput, { target: { value: 'TestCorp' } });
        fireEvent.change(roleInput, { target: { value: 'TestRole' } });

        // Submit form
        const submitButton = screen.getByText('Save Application');
        fireEvent.click(submitButton);

        // Since we are running the actual addApplicationMutation, if toDb contains a hook error, this will crash.
        // If it succeeds, the modal should close. We will just check that it doesn't crash here.
        await waitFor(() => {
            expect(screen.queryByText('New Application')).not.toBeInTheDocument();
        });
    });
});
