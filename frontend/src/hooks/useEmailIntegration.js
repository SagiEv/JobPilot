import { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

export function useEmailIntegration() {
    const [integration, setIntegration] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/api/email/status');
            setIntegration(res.data.integration);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch email status:', err);
            setError('Failed to load email integration status.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const connectGoogle = async (userId) => {
        // Redirect to backend OAuth route
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        window.location.href = `${apiUrl}/api/email/auth/google?userId=${userId}`;
    };

    const disconnectGoogle = async () => {
        try {
            await apiClient.delete('/api/email/disconnect');
            setIntegration(null);
        } catch (err) {
            throw new Error('Failed to disconnect');
        }
    };

    const syncEmails = async () => {
        try {
            setSyncing(true);
            await apiClient.post('/api/email/sync');
            await fetchStatus(); // Refresh status to show 'syncing'
        } catch (err) {
            throw new Error('Failed to start sync');
        } finally {
            setSyncing(false);
        }
    };

    return { integration, loading, error, syncing, connectGoogle, disconnectGoogle, syncEmails, refreshStatus: fetchStatus };
}
