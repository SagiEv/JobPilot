import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

export function useSettings() {
    const queryClient = useQueryClient();

    const { data: settings = { groq_token_set: false, groq_token_preview: null, timezone: 'Asia/Jerusalem' }, isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const res = await apiClient.get('/api/settings');
            return res.data;
        }
    });

    const error = queryError ? 'Failed to load settings.' : null;

    const saveSettingsMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await apiClient.put('/api/settings', payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
        onError: (err) => {
            console.error('Failed to save settings:', err);
        }
    });

    const saveGroqToken = async (token) => {
        return saveSettingsMutation.mutateAsync({ groq_token: token });
    };

    const clearGroqToken = async () => {
        return saveSettingsMutation.mutateAsync({ groq_token: '' });
    };

    const saveTimezone = async (timezone) => {
        return saveSettingsMutation.mutateAsync({ timezone });
    };

    return {
        settings,
        loading,
        saving: saveSettingsMutation.isPending,
        error: error || (saveSettingsMutation.isError ? 'Failed to save settings.' : null),
        saveGroqToken,
        clearGroqToken,
        saveTimezone,
    };
}
