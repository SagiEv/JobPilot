import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfilePage from '../ProfilePage';
import { useProfile } from '../../hooks/useProfile';
import { useRolesBank } from '../../hooks/useRolesBank';

import { vi, describe, beforeEach, it, expect } from 'vitest';

// Mock the hooks
vi.mock('../../hooks/useProfile');
vi.mock('../../hooks/useRolesBank');
vi.mock('../../components/ToastProvider', () => ({
  useToast: () => ({ addToast: vi.fn() })
}));
vi.mock('../../components/ConfirmProvider', () => ({
  useConfirm: () => vi.fn()
}));

// Mock React Quill to avoid document undefined errors in tests
vi.mock('react-quill', () => {
    const Component = () => <div data-testid="mock-quill" />;
    return { default: Component };
});

describe('ProfilePage', () => {
  const mockHandleProfileChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useRolesBank.mockReturnValue({
      data: [{ id: 1, name: 'Software Engineer' }, { id: 2, name: 'UI' }],
      isLoading: false
    });
  });

  it('renders current experience and calculates months dynamically (Sunny Day)', () => {
    useProfile.mockReturnValue({
      profile: {
        experiences: [
          { status: 'current', role_id: 1, years: null, start_date: '2023-01-01' }
        ]
      },
      loading: false,
      error: null,
      handleProfileChange: mockHandleProfileChange
    });

    render(<ProfilePage />);

    expect(screen.getByText('Current Experience')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
    
    // We can't strictly match dynamic text because "months/years" depends on current date, 
    // but we can check if "Dynamic duration:" is present.
    expect(screen.getByText(/Dynamic duration:/)).toBeInTheDocument();
  });

  it('allows adding 0 years of experience (Sunny Day Junior Case)', () => {
    useProfile.mockReturnValue({
      profile: {
        experiences: [
          { status: 'current', role_id: 2, years: 0, start_date: null }
        ]
      },
      loading: false,
      error: null,
      handleProfileChange: mockHandleProfileChange
    });

    render(<ProfilePage />);
    const inputs = screen.getAllByPlaceholderText('e.g. 0');
    expect(inputs[0].value).toBe('0');
  });

  it('displays warning if end date is before start date (Rainy Day)', () => {
    useProfile.mockReturnValue({
      profile: {
        experiences: [
          { status: 'previous', role_id: 1, start_date: '2023-01-01', end_date: '2022-01-01' }
        ]
      },
      loading: false,
      error: null,
      handleProfileChange: mockHandleProfileChange
    });

    render(<ProfilePage />);
    expect(screen.getByText('End date cannot be before start date.')).toBeInTheDocument();
  });
});
