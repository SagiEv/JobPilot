import { useState, useEffect, useCallback } from 'react';
import api from '../api';

export function useSearch() {
    const [searchSettings, setSearchSettings] = useState({
        id: null,
        keywords: ['Backend Engineer', 'Node.js'],
        excludeKeywords: ['Senior Manager'],
        targetSites: [],
        email: '',
        schedule: 'Manual only',
        lastResults: []
    });

    const fetchSettings = async () => {
        try {
            const [settingsRes, sitesRes] = await Promise.all([
                api.get('/api/search-settings'),
                api.get('/api/search-settings/sites')
            ]);
            
            setSearchSettings(prev => ({
                ...prev,
                ...(settingsRes.data && Object.keys(settingsRes.data).length > 0 ? {
                    id: settingsRes.data.id,
                    keywords: settingsRes.data.keywords || [],
                    excludeKeywords: settingsRes.data.exclude_keywords || [],
                    email: settingsRes.data.email || '',
                    schedule: settingsRes.data.schedule || 'Manual only',
                    lastResults: settingsRes.data.last_results || []
                } : {}),
                targetSites: sitesRes.data || []
            }));
        } catch (error) {
            console.error("Failed to fetch search settings:", error);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const saveSettingsToDb = async (newSettings) => {
        try {
            const payload = {
                id: newSettings.id,
                keywords: newSettings.keywords,
                exclude_keywords: newSettings.excludeKeywords,
                email: newSettings.email,
                schedule: newSettings.schedule,
                last_results: newSettings.lastResults
            };
            const { data } = await api.put('/api/search-settings', payload);
            if (data && data.id && !newSettings.id) {
                setSearchSettings(prev => ({ ...prev, id: data.id }));
            }
        } catch (error) {
            console.error("Failed to save search settings:", error);
        }
    };

    const updateSettings = (key, value) => {
        setSearchSettings(prev => {
            const next = { ...prev, [key]: value };
            if (key !== 'targetSites') {
                saveSettingsToDb(next);
            }
            return next;
        });
    };

    const addTag = (type, tag) => {
        if (!tag.trim()) return;
        const key = type === 'keyword' ? 'keywords' : 'excludeKeywords';
        setSearchSettings(prev => {
            const next = { ...prev, [key]: [...prev[key], tag.trim()] };
            saveSettingsToDb(next);
            return next;
        });
    };

    const removeTag = (type, index) => {
        const key = type === 'keyword' ? 'keywords' : 'excludeKeywords';
        setSearchSettings(prev => {
            const next = { ...prev, [key]: prev[key].filter((_, i) => i !== index) };
            saveSettingsToDb(next);
            return next;
        });
    };

    const toggleSite = async (id) => {
        const site = searchSettings.targetSites.find(s => s.id === id);
        if (!site) return;
        
        const nextEnabled = !site.enabled;
        
        setSearchSettings(prev => ({
            ...prev,
            targetSites: prev.targetSites.map(s =>
                s.id === id ? { ...s, enabled: nextEnabled } : s
            )
        }));

        try {
            await api.put(`/api/search-settings/sites/${id}`, { enabled: nextEnabled });
        } catch (error) {
            console.error("Failed to update site:", error);
        }
    };

    const addSite = async (name, url) => {
        if (!name || !url) return;
        
        try {
            const { data } = await api.post('/api/search-settings/sites', { name, url, enabled: true });
            setSearchSettings(prev => ({
                ...prev,
                targetSites: [...prev.targetSites, data]
            }));
        } catch (error) {
            console.error("Failed to add site:", error);
        }
    };

    const removeSite = async (id) => {
        setSearchSettings(prev => ({
            ...prev,
            targetSites: prev.targetSites.filter(s => s.id !== id)
        }));
        try {
            await api.delete(`/api/search-settings/sites/${id}`);
        } catch (error) {
            console.error("Failed to delete site:", error);
        }
    };

    const updateSite = async (id, name, url) => {
        setSearchSettings(prev => ({
            ...prev,
            targetSites: prev.targetSites.map(s =>
                s.id === id ? { ...s, name, url } : s
            )
        }));
        try {
            await api.put(`/api/search-settings/sites/${id}`, { name, url });
        } catch (error) {
            console.error("Failed to update site:", error);
        }
    };

    const clearResults = () => {

        setSearchSettings(prev => {
            const next = { ...prev, lastResults: [] };
            saveSettingsToDb(next);
            return next;
        });
    };

    return { searchSettings, updateSettings, addTag, removeTag, addSite, removeSite, updateSite, toggleSite, clearResults };
}