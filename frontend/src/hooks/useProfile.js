import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { getAccessToken } from '../services/apiClient';

export function useProfile() {
    const queryClient = useQueryClient();
    const [isGeneratingCV, setIsGeneratingCV] = useState(false);

    const { data: profile = {}, isLoading: loading, error: queryError } = useQuery({
        enabled: !!getAccessToken(),
        queryKey: ['profile'],
        queryFn: async () => {
            const response = await apiClient.get('/api/profile/');
            return response.data || {};
        }
    });

    const error = queryError ? 'Failed to load profile data.' : null;

    const updateProfileMutation = useMutation({
        mutationFn: (updatedProfile) => apiClient.put('/api/profile', updatedProfile)
    });

    const setProfile = useCallback((updater) => {
        queryClient.setQueryData(['profile'], updater);
    }, [queryClient]);

    const handleProfileChange = useCallback((field, value) => {
        let updated;
        queryClient.setQueryData(['profile'], (prev = {}) => {
            updated = { ...prev };
            if (field.includes('.')) {
                const [parent, child] = field.split('.');
                updated[parent] = { ...updated[parent], [child]: value };
            } else {
                updated[field] = value;
            }
            return updated;
        });
        if (updated) {
            updateProfileMutation.mutate(updated);
        }
    }, [queryClient, updateProfileMutation]);

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

    const handlePreviewCV = useCallback(async (themeId) => {
        try {
            const response = await apiClient.post(
                '/api/cv/preview-jsonresume',
                {
                    themeId,
                    cvData: profile.cvData,
                    personalInfo: {
                        name: profile.name,
                        email: profile.email,
                        roles: profile.roles,
                        phone: profile.phone,
                        linkedin: profile.linkedin,
                        github: profile.github || profile.website
                    }
                }
            );
            return response.data; // html string
        } catch (err) {
            console.error("Failed to preview CV", err);
            throw err;
        }
    }, [profile]);

    const handleDownloadJSONResumeCV = useCallback(async (themeId) => {
        setIsGeneratingCV(true);
        try {
            const response = await apiClient.post(
                '/api/cv/generate-jsonresume',
                {
                    themeId,
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
                `${(profile.name || 'CV').replace(/\s+/g, '_')}_${themeId}_CV.pdf`
            );
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            console.error("Failed to generate JSONResume CV", err);
            alert("Failed to generate JSONResume CV");
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
        handlePreviewCV,
        handleDownloadJSONResumeCV,
        isGeneratingCV
    };
}