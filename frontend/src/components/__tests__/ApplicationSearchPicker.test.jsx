import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ApplicationSearchPicker from '../ApplicationSearchPicker';

const apps = [
    { id: 1, COMPANY: 'Stripe', ROLE_ID: 'Backend Engineer', STATUS: 'Interviewing', STAGE: 'Technical', DATE: '2026-06-10' },
    { id: 2, COMPANY: 'Linear', ROLE_ID: 'Frontend Engineer', STATUS: 'Applied', STAGE: '', DATE: '2026-06-05' },
];

describe('ApplicationSearchPicker', () => {
    it('supports filtering and keyboard Enter selection in dashboard variant', () => {
        const onSelect = vi.fn();
        render(
            <ApplicationSearchPicker
                variant="dashboard"
                applications={apps}
                onSelect={onSelect}
                ariaLabel="Quick search applications"
                showRecentOnFocus
            />
        );

        const input = screen.getByLabelText('Quick search applications');
        fireEvent.focus(input);
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        fireEvent.keyDown(input, { key: 'Enter' });

        // ArrowDown moved from index 0 (Stripe) to index 1 (Linear)
        expect(onSelect).toHaveBeenCalledWith(apps[1]);
    });

    it('renders selected pill and calls onClearSelection in modal variant', () => {
        const onClear = vi.fn();
        render(
            <ApplicationSearchPicker
                variant="modal"
                applications={apps}
                selectedApp={apps[0]}
                onClearSelection={onClear}
            />
        );

        expect(screen.getByText('Stripe — Backend Engineer')).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('Unlink application'));
        expect(onClear).toHaveBeenCalledTimes(1);
    });
});
