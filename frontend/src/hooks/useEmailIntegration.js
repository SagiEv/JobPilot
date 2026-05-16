import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

export function useEmailIntegration() {
    const queryClient = useQueryClient();
    const [syncing, setSyncing] = useState(false);

    const { data: integration = null, isLoading: loading, error: queryError, refetch: fetchStatus } = useQuery({
        queryKey: ['emailStatus'],
        queryFn: async () => {
            const res = await apiClient.get('/api/email/status');
            return res.data.integration;
        }
    });

    const error = queryError ? 'Failed to load email integration status.' : null;

    const disconnectMutation = useMutation({
        mutationFn: async () => {
            await apiClient.delete('/api/email/disconnect');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emailStatus'] });
        }
    });

    const syncMutation = useMutation({
        mutationFn: async () => {
            await apiClient.post('/api/email/sync');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emailStatus'] });
        }
    });

    const connectGoogle = async (userId) => {
        // Redirect to backend OAuth route
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        window.location.href = `${apiUrl}/api/email/auth/google?userId=${userId}`;
    };

    const disconnectGoogle = async () => {
        try {
            await disconnectMutation.mutateAsync();
        } catch (err) {
            throw new Error('Failed to disconnect');
        }
    };

    const syncEmails = async () => {
        try {
            setSyncing(true);
            await syncMutation.mutateAsync();
        } catch (err) {
            throw new Error('Failed to start sync');
        } finally {
            setSyncing(false);
        }
    };

    return { 
        integration, 
        loading, 
        error, 
        syncing, 
        connectGoogle, 
        disconnectGoogle, 
        syncEmails, 
        refreshStatus: fetchStatus 
    };
}
