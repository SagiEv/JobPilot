import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToastProvider, useToast } from '../ToastProvider';

// A test component to consume the ToastContext
const TestComponent = () => {
    const { addToast } = useToast();

    return (
        <div>
            <button onClick={() => addToast('Test Message', 'success')}>
                Show Success Toast
            </button>
            <button onClick={() => addToast('Processing...', 'processing', null, 'proc-id')}>
                Show Processing Toast
            </button>
        </div>
    );
};

describe('ToastProvider', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders children correctly', () => {
        render(
            <ToastProvider>
                <div data-testid="child-element">Child Content</div>
            </ToastProvider>
        );
        expect(screen.getByTestId('child-element')).toBeInTheDocument();
    });

    it('adds and displays a toast', () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        );

        fireEvent.click(screen.getByText('Show Success Toast'));
        
        expect(screen.getByText('Test Message')).toBeInTheDocument();
    });

    it('removes non-processing toasts automatically after 5 seconds', () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        );

        fireEvent.click(screen.getByText('Show Success Toast'));
        expect(screen.getByText('Test Message')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(screen.queryByText('Test Message')).not.toBeInTheDocument();
    });

    it('does not automatically remove processing toasts', () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        );

        fireEvent.click(screen.getByText('Show Processing Toast'));
        expect(screen.getByText('Processing...')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(6000);
        });

        expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
});
