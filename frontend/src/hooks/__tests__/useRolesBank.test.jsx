import { renderHook, waitFor } from '@testing-library/react';
import { useRolesBank } from '../useRolesBank';
import apiClient from '../../services/apiClient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { vi, describe, beforeEach, it, expect } from 'vitest';

vi.mock('../../services/apiClient', () => ({
  __esModule: true,
  default: {
    get: vi.fn()
  },
  getAccessToken: vi.fn(() => 'mock-token')
}));

describe('useRolesBank', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('fetches roles bank successfully (Sunny Day)', async () => {
    const mockRoles = [{ id: 1, name: 'Software Engineer' }];
    apiClient.get.mockResolvedValueOnce({ data: mockRoles });

    const { result } = renderHook(() => useRolesBank(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockRoles);
    expect(apiClient.get).toHaveBeenCalledWith('/api/roles-bank');
  });

  it('handles API error gracefully (Rainy Day)', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useRolesBank(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
  });
});
