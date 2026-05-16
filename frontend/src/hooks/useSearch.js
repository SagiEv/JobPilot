import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

export function useSearch() {
    const queryClient = useQueryClient();

    const { data: searchSettings = {
        id: null,
        keywords: [],
        excludeKeywords: [],
        targetSites: [],
        email: '',
        schedule: 'Manual only',
        lastResults: []
    }, isLoading: loading } = useQuery({
        queryKey: ['searchSettings'],
        queryFn: async () => {
            const [settingsRes, sitesRes] = await Promise.all([
                apiClient.get('/api/search-settings'),
                apiClient.get('/api/search-settings/sites')
            ]);

            return {
                ...(settingsRes.data && Object.keys(settingsRes.data).length > 0 ? {
                    id: settingsRes.data.id,
                    keywords: settingsRes.data.keywords || [],
                    excludeKeywords: settingsRes.data.exclude_keywords || [],
                    email: settingsRes.data.email || '',
                    schedule: settingsRes.data.schedule || 'Manual only',
                    lastResults: settingsRes.data.last_results || []
                } : {
                    id: null,
                    keywords: [],
                    excludeKeywords: [],
                    email: '',
                    schedule: 'Manual only',
                    lastResults: []
                }),
                targetSites: sitesRes.data || []
            };
        }
    });

    const saveSettingsMutation = useMutation({
        mutationFn: async (snapshot) => {
            const payload = {
                id: snapshot.id,
                keywords: snapshot.keywords,
                exclude_keywords: snapshot.excludeKeywords,
                email: snapshot.email,
                schedule: snapshot.schedule,
                last_results: snapshot.lastResults
            };
            const { data } = await apiClient.put('/api/search-settings', payload);
            return data;
        },
        onSuccess: (data) => {
            // First save (INSERT) -> we get a generated id back. Ensure we cache it.
            if (data && data.id) {
                queryClient.setQueryData(['searchSettings'], (old) => {
                    if (!old) return old;
                    return { ...old, id: data.id };
                });
            }
        }
    });

    const addSiteMutation = useMutation({
        mutationFn: async ({ name, url }) => {
            const { data } = await apiClient.post('/api/search-settings/sites', { name, url, enabled: true });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['searchSettings'] });
        }
    });

    const updateSiteMutation = useMutation({
        mutationFn: async ({ id, payload }) => {
            await apiClient.put(`/api/search-settings/sites/${id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['searchSettings'] });
        }
    });

    const removeSiteMutation = useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/api/search-settings/sites/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['searchSettings'] });
        }
    });

    const updateSettings = (key, value) => {
        let next;
        queryClient.setQueryData(['searchSettings'], (prev) => {
            if (!prev) return prev;
            next = { ...prev, [key]: value };
            return next;
        });
        if (next && key !== 'targetSites') {
            saveSettingsMutation.mutate(next);
        }
    };

    const addTag = (type, tag) => {
        if (!tag.trim()) return;
        const key = type === 'keyword' ? 'keywords' : 'excludeKeywords';
        let next;
        queryClient.setQueryData(['searchSettings'], (prev) => {
            if (!prev) return prev;
            next = { ...prev, [key]: [...prev[key], tag.trim()] };
            return next;
        });
        if (next) {
            setTimeout(() => saveSettingsMutation.mutate(next), 0);
        }
    };

    const removeTag = (type, index) => {
        const key = type === 'keyword' ? 'keywords' : 'excludeKeywords';
        let next;
        queryClient.setQueryData(['searchSettings'], (prev) => {
            if (!prev) return prev;
            next = { ...prev, [key]: prev[key].filter((_, i) => i !== index) };
            return next;
        });
        if (next) {
            setTimeout(() => saveSettingsMutation.mutate(next), 0);
        }
    };

    const toggleSite = async (id) => {
        const site = searchSettings.targetSites.find(s => s.id === id);
        if (!site) return;

        const nextEnabled = !site.enabled;
        // Optimistic
        queryClient.setQueryData(['searchSettings'], (prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                targetSites: prev.targetSites.map(s => s.id === id ? { ...s, enabled: nextEnabled } : s)
            };
        });

        updateSiteMutation.mutate({ id, payload: { enabled: nextEnabled } });
    };

    const addSite = async (name, url) => {
        if (!name || !url) return;
        addSiteMutation.mutate({ name, url });
    };

    const removeSite = async (id) => {
        // Optimistic
        queryClient.setQueryData(['searchSettings'], (prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                targetSites: prev.targetSites.filter(s => s.id !== id)
            };
        });
        removeSiteMutation.mutate(id);
    };

    const updateSite = async (id, name, url) => {
        // Optimistic
        queryClient.setQueryData(['searchSettings'], (prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                targetSites: prev.targetSites.map(s => s.id === id ? { ...s, name, url } : s)
            };
        });
        updateSiteMutation.mutate({ id, payload: { name, url } });
    };

    const clearResults = () => {
        let next;
        queryClient.setQueryData(['searchSettings'], (prev) => {
            if (!prev) return prev;
            next = { ...prev, lastResults: [] };
            return next;
        });
        if (next) {
            setTimeout(() => saveSettingsMutation.mutate(next), 0);
        }
    };

    return { 
        loading, 
        searchSettings, 
        updateSettings, 
        addTag, 
        removeTag, 
        addSite, 
        removeSite, 
        updateSite, 
        toggleSite, 
        clearResults 
    };
}