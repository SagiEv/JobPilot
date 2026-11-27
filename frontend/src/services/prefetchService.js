import { getAccessToken } from './apiClient';
import {
    CORE_INITIAL_QUERIES,
    BACKGROUND_INITIAL_QUERIES,
    TAB_PREFETCH_QUERIES,
} from '../queries/queryDefinitions';

/**
 * Prefetches core Dashboard and Applications data right after authentication
 * so the initial screen renders populated without a secondary PageLoader flash.
 */
export const prefetchInitialData = async (queryClient) => {
    if (!queryClient || !getAccessToken()) return;

    // Warm secondary dashboard feeds in the background without blocking paint
    Promise.allSettled(
        BACKGROUND_INITIAL_QUERIES.map((query) => queryClient.prefetchQuery(query))
    );

    // Await core dashboard & tracker queries so initial render is immediately populated
    await Promise.allSettled(
        CORE_INITIAL_QUERIES.map((query) => queryClient.prefetchQuery(query))
    );
};

/**
 * Prefetches data for a target sidebar tab on hover/focus intent.
 */
export const prefetchTabData = (queryClient, tabId) => {
    if (!queryClient || !getAccessToken()) return;
    const queries = TAB_PREFETCH_QUERIES[tabId];
    if (!queries?.length) return;
    Promise.allSettled(queries.map((query) => queryClient.prefetchQuery(query)));
};
