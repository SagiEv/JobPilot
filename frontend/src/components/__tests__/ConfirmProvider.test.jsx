import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmProvider, useConfirm } from '../ConfirmProvider';

// A test component to consume the ConfirmContext
const TestComponent = ({ onResult }) => {
    const confirm = useConfirm();

    const handleClick = async () => {
        const result = await confirm('Are you sure you want to delete this?');
        onResult(result);
    };

    return (
        <button onClick={handleClick}>Trigger Confirm</button>
    );
};

describe('ConfirmProvider', () => {
    it('renders children correctly and confirm dialog is hidden by default', () => {
        render(
            <ConfirmProvider>
                <div data-testid="child-element">Child Content</div>
            </ConfirmProvider>
        );
        expect(screen.getByTestId('child-element')).toBeInTheDocument();
        expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    });

    it('displays the confirmation dialog when confirm is called', () => {
        render(
            <ConfirmProvider>
                <TestComponent onResult={vi.fn()} />
            </ConfirmProvider>
        );

        fireEvent.click(screen.getByText('Trigger Confirm'));

        expect(screen.getByText('Confirm Action')).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to delete this?')).toBeInTheDocument();
    });

    it('resolves with true when Confirm is clicked', async () => {
        const handleResult = vi.fn();
        render(
            <ConfirmProvider>
                <TestComponent onResult={handleResult} />
            </ConfirmProvider>
        );

        fireEvent.click(screen.getByText('Trigger Confirm'));
        
        const confirmButton = screen.getByRole('button', { name: /^confirm$/i });
        fireEvent.click(confirmButton);

        // Dialog should disappear
        await waitFor(() => {
            expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
        });
        
        // Mock should be called with true
        expect(handleResult).toHaveBeenCalledWith(true);
    });

    it('resolves with false when Cancel is clicked', async () => {
        const handleResult = vi.fn();
        render(
            <ConfirmProvider>
                <TestComponent onResult={handleResult} />
            </ConfirmProvider>
        );

        fireEvent.click(screen.getByText('Trigger Confirm'));
        
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);

        // Dialog should disappear
        await waitFor(() => {
            expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
        });
        
        // Mock should be called with false
        expect(handleResult).toHaveBeenCalledWith(false);
    });
});
