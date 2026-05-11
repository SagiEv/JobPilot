import { useState, useEffect, useCallback } from 'react';
// import api from '../api';
import apiClient from '../services/apiClient';

export function useProfile() {
    const [profile, setProfile] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isGeneratingCV, setIsGeneratingCV] = useState(false);

    // Fetch profile from backend on mount
    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            setError(null);
            try {
                // const response = await api.get('/api/profile/');
                const response = await apiClient.get('/api/profile/');
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
            await apiClient.put('/api/profile', updatedProfile);
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


    const handleMakeCV = useCallback(async () => {
        setIsGeneratingCV(true);
        try {
            const response = await apiClient.post(
                '/api/cv/generate',
                {
                    cvData: profile.cvData,
                    personalInfo: {
                        name: profile.name,
                        email: profile.email,
                        roles: profile.roles,
                        phone: profile.phone,
                        linkedin: profile.linkedin,
                        github: profile.github || profile.website
                    }
                },
                { responseType: 'arraybuffer' }
            );

            const url = window.URL.createObjectURL(
                new Blob([response.data], { type: 'application/pdf' })
            );
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute(
                'download',
                `${(profile.name || 'CV').replace(/\s+/g, '_')}_CV.pdf`
            );
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            console.error("Failed to generate CV", err);
            alert("Failed to generate CV");
        } finally {
            setIsGeneratingCV(false);
        }
    }, [profile]);

    return {
        profile,
        loading,
        error,
        handleProfileChange,
        setProfile,
        handleMakeCV,
        isGeneratingCV
    };
}