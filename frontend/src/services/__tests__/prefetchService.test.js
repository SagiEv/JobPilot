import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { prefetchInitialData, prefetchTabData } from '../prefetchService';
import { setAccessToken } from '../apiClient';
import { server } from '../../tests/setup';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000';

describe('prefetchInitialData', () => {
    let queryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        setAccessToken(null);
    });

    it('skips prefetching when no access token is set', async () => {
        const prefetchSpy = vi.spyOn(queryClient, 'prefetchQuery');
        await prefetchInitialData(queryClient);
        expect(prefetchSpy).not.toHaveBeenCalled();
    });

    it('prefetches core dashboard and application queries when authenticated', async () => {
        setAccessToken('valid-token');
        server.use(
            http.get(`${API_URL}/api/applications`, () =>
                HttpResponse.json([{ id: 10, company: 'Stripe', role_id: 'SWE', status: 'Applied', date: '2026-06-01' }])
            ),
            http.get(`${API_URL}/api/events`, () =>
                HttpResponse.json([{ id: 1, title: 'Screen', type: 'interview', date: '2026-06-15T10:00:00Z' }])
            ),
            http.get(`${API_URL}/api/applications/stats/daily`, () =>
                HttpResponse.json({ appliedToday: 2, rejectedToday: 0 })
            ),
            http.get(`${API_URL}/api/settings`, () =>
                HttpResponse.json({ timezone: 'UTC' })
            ),
            http.get(`${API_URL}/api/notifications`, () => HttpResponse.json([])),
            http.get(`${API_URL}/api/notifications/unread-count`, () => HttpResponse.json({ count: 0 })),
            http.get(`${API_URL}/api/rss-feeds/jobs`, () => HttpResponse.json([])),
            http.get(`${API_URL}/api/search-settings/scraped-jobs`, () => HttpResponse.json([]))
        );

        await prefetchInitialData(queryClient);

        // Core queries are populated in cache with exact hook shapes
        expect(queryClient.getQueryData(['applications'])).toEqual([
            expect.objectContaining({ id: 10, COMPANY: 'Stripe', ROLE_ID: 'SWE', STATUS: 'Applied' })
        ]);
        expect(queryClient.getQueryData(['events'])).toHaveLength(1);
        expect(queryClient.getQueryData(['dailyStats'])).toEqual({ appliedToday: 2, rejectedToday: 0 });
        expect(queryClient.getQueryData(['settings'])).toEqual({ timezone: 'UTC' });
    });

    it('prefetches tab-specific queries via prefetchTabData', async () => {
        setAccessToken('valid-token');
        server.use(
            http.get(`${API_URL}/api/contacts`, () =>
                HttpResponse.json([{ id: 1, name: 'Ada', company: 'Stripe' }])
            )
        );

        prefetchTabData(queryClient, 'network');

        await vi.waitFor(() => {
            expect(queryClient.getQueryData(['contacts'])).toEqual([{ id: 1, name: 'Ada', company: 'Stripe' }]);
        });
    });
});
