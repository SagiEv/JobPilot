import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { getAccessToken } from '../services/apiClient';

const DEFAULT_SETTINGS = {
    groq_token_set: false,
    groq_token_preview: null,
    openai_token_set: false,
    openai_token_preview: null,
    claude_token_set: false,
    claude_token_preview: null,
    gemini_token_set: false,
    gemini_token_preview: null,
    ai_routing: {},
    timezone: 'Asia/Jerusalem',
    smtp_email: null,
    smtp_host: null,
    smtp_port: 993,
    smtp_enabled: false,
    smtp_poll_interval_min: 15,
    smtp_password_set: false,
    smtp_last_polled_at: null,
};

export function useSettings() {
    const queryClient = useQueryClient();
    const [testResult, setTestResult] = useState(null); // { success, error }
    const [testing, setTesting] = useState(false);

    const { data: settings = DEFAULT_SETTINGS, isLoading: loading, error: queryError } = useQuery({
        enabled: !!getAccessToken(),
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

    const saveAiToken = async (provider, token) => {
        return saveSettingsMutation.mutateAsync({ [`${provider}_token`]: token });
    };

    const saveAiRouting = async (ai_routing) => {
        return saveSettingsMutation.mutateAsync({ ai_routing });
    };

    const saveTimezone = async (timezone) => {
        return saveSettingsMutation.mutateAsync({ timezone });
    };

    const saveSmtpSettings = async (smtpData) => {
        return saveSettingsMutation.mutateAsync(smtpData);
    };

    const clearSmtpPassword = async () => {
        return saveSettingsMutation.mutateAsync({ smtp_password: '' });
    };

    const testSmtpConnection = async (overrideData = {}) => {
        setTesting(true);
        setTestResult(null);
        try {
            const payload = {
                smtp_email: overrideData.smtp_email || settings.smtp_email,
                smtp_host: overrideData.smtp_host || settings.smtp_host,
                smtp_port: overrideData.smtp_port || settings.smtp_port,
                smtp_password: overrideData.smtp_password || undefined,
            };
            const res = await apiClient.post('/api/settings/test-smtp', payload);
            setTestResult(res.data);
            return res.data;
        } catch (err) {
            const result = { success: false, error: err.response?.data?.error || err.message };
            setTestResult(result);
            return result;
        } finally {
            setTesting(false);
        }
    };

    const getEmailLogs = async (limit = 50) => {
        const res = await apiClient.get(`/api/settings/email-logs?limit=${limit}`);
        return res.data;
    };

    const testAiToken = async (provider) => {
        try {
            const res = await apiClient.post('/api/settings/test-ai-token', { provider });
            return res.data;
        } catch (err) {
            return { success: false, error: err.response?.data?.error || err.message };
        }
    };

    return {
        settings,
        loading,
        saving: saveSettingsMutation.isPending,
        error: error || (saveSettingsMutation.isError ? 'Failed to save settings.' : null),
        saveAiToken,
        saveAiRouting,
        saveTimezone,
        saveSmtpSettings,
        clearSmtpPassword,
        testSmtpConnection,
        testing,
        testResult,
        setTestResult,
        getEmailLogs,
        testAiToken,
    };
}
