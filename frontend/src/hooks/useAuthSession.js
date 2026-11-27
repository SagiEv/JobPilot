import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { restoreSession } from '../services/authService';
import { supabase } from '../supabaseClient';
import { setAccessToken } from '../services/apiClient';
import { prefetchInitialData } from '../services/prefetchService';

/**
 * Manages initial session restoration, Supabase token refresh sync,
 * sign-out cache clearing, and initial data prefetching.
 */
export function useAuthSession() {
    const queryClient = useQueryClient();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isInitialising, setIsInitialising] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const session = await restoreSession();
            if (session) {
                await prefetchInitialData(queryClient);
                setIsAuthenticated(true);
            }
            setIsInitialising(false);
        };
        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'TOKEN_REFRESHED' && session) {
                    setAccessToken(session.access_token);
                    localStorage.setItem('refresh_token', session.refresh_token);
                } else if (event === 'SIGNED_OUT') {
                    setAccessToken(null);
                    localStorage.removeItem('refresh_token');
                    queryClient.clear();
                    setIsAuthenticated(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [queryClient]);

    return { isAuthenticated, setIsAuthenticated, isInitialising };
}
