import { useState, useEffect, useCallback } from 'react';
import api from '../api';

export function useProfile() {
    const [profile, setProfile] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch profile from backend on mount
    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await api.get('/api/profile/');
                if (response.data && Object.keys(response.data).length > 0) {
                    setProfile(response.data);
                }
            } catch (err) {
                console.error('Failed to fetch profile:', err);
                setError('Failed to load profile data.');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    // Persist changes to backend
    const saveProfile = useCallback(async (updatedProfile) => {
        try {
            await api.put('/api/profile', updatedProfile);
        } catch (err) {
            console.error('Failed to save profile:', err);
        }
    }, []);

    const handleProfileChange = (field, value) => {
        setProfile(prev => {
            let updated = { ...prev };
            if (field.includes('.')) {
                const [parent, child] = field.split('.');
                updated[parent] = { ...updated[parent], [child]: value };
            } else {
                updated[field] = value;
            }
            saveProfile(updated);
            return updated;
        });
    };

    return {
        profile,
        loading,
        error,
        handleProfileChange,
        setProfile,
    };
}