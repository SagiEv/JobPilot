import { useState, useEffect, useCallback } from 'react';
// import api from '../api';
import apiClient from '../services/apiClient';

export function useSettings() {
    const [settings, setSettings] = useState({
        groq_token_set: false,
        groq_token_preview: null,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get('/api/settings');
            setSettings(res.data);
        } catch (err) {
            console.error('Failed to fetch settings:', err);
            setError('Failed to load settings.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const saveGroqToken = useCallback(async (token) => {
        setSaving(true);
        setError(null);
        try {
            const res = await apiClient.put('/api/settings', { groq_token: token });
            // Refresh full state so preview updates
            await fetchSettings();
            return res.data;
        } catch (err) {
            console.error('Failed to save settings:', err);
            setError('Failed to save settings.');
            throw err;
        } finally {
            setSaving(false);
        }
    }, [fetchSettings]);

    const clearGroqToken = useCallback(async () => {
        return saveGroqToken('');
    }, [saveGroqToken]);

    return {
        settings,
        loading,
        saving,
        error,
        saveGroqToken,
        clearGroqToken,
    };
}
