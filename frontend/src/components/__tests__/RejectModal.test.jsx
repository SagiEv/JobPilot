import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RejectModal from '../RejectModal';

describe('RejectModal', () => {
    const defaultProps = {
        isOpen: true,
        companyName: 'Acme Corp',
        onClose: vi.fn(),
        onConfirm: vi.fn(),
    };

    it('does not render when isOpen is false', () => {
        render(<RejectModal {...defaultProps} isOpen={false} />);
        expect(screen.queryByText(/Reject Application/)).not.toBeInTheDocument();
    });

    it('renders with default date as today', () => {
        render(<RejectModal {...defaultProps} />);
        
        const dateInput = screen.getByLabelText('Date');
        expect(dateInput).toBeInTheDocument();
        
        const today = new Date();
        const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        expect(dateInput.value).toBe(expectedDate);
    });

    it('submits with modified date, reason, and autoReject flag', () => {
        const onConfirm = vi.fn();
        render(<RejectModal {...defaultProps} onConfirm={onConfirm} />);

        const dateInput = screen.getByLabelText('Date');
        fireEvent.change(dateInput, { target: { value: '2026-03-10' } });

        const reasonInput = screen.getByPlaceholderText('e.g. They went with an internal candidate');
        fireEvent.change(reasonInput, { target: { value: 'Role cancelled' } });

        const autoRejectCheck = screen.getByLabelText(/Automatically rejected/);
        fireEvent.click(autoRejectCheck);

        const confirmBtn = screen.getByText('Confirm Rejection');
        fireEvent.click(confirmBtn);

        expect(onConfirm).toHaveBeenCalledWith({
            date: '2026-03-10',
            reason: 'Role cancelled',
            autoReject: true,
        });
    });

    it('calls onClose when cancel or close button is clicked', () => {
        const onClose = vi.fn();
        render(<RejectModal {...defaultProps} onClose={onClose} />);

        const cancelBtn = screen.getByText('Cancel');
        fireEvent.click(cancelBtn);
        expect(onClose).toHaveBeenCalledTimes(1);

        const closeBtn = screen.getByText('✕');
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});
