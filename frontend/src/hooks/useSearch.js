import { useState, useEffect } from 'react';
// import api from '../api';
import apiClient from '../services/apiClient';

export function useSearch() {
    const [loading, setLoading] = useState(true);
    const [searchSettings, setSearchSettings] = useState({
        id: null,
        keywords: [],
        excludeKeywords: [],
        targetSites: [],
        email: '',
        schedule: 'Manual only',
        lastResults: []
    });

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const [settingsRes, sitesRes] = await Promise.all([
                apiClient.get('/api/search-settings'),
                apiClient.get('/api/search-settings/sites')
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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    /**
     * Persist a settings snapshot to the DB.
     * Takes the already-computed next state object so it is never stale.
     * On first INSERT the server returns the new row id; we write it back so
     * all future calls do UPDATE instead of inserting duplicate rows.
     */
    const saveSettingsToDb = async (snapshot) => {
        try {
            const payload = {
                id: snapshot.id,
                keywords: snapshot.keywords,
                exclude_keywords: snapshot.excludeKeywords,
                email: snapshot.email,
                schedule: snapshot.schedule,
                last_results: snapshot.lastResults
            };
            const { data } = await apiClient.put('/api/search-settings', payload);
            // First save (INSERT) → persist the generated id
            if (data && data.id && !snapshot.id) {
                setSearchSettings(prev => ({ ...prev, id: data.id }));
            }
        } catch (error) {
            console.error("Failed to save search settings:", error);
        }
    };

    const updateSettings = (key, value) => {
        setSearchSettings(prev => {
            const next = { ...prev, [key]: value };
            if (key !== 'targetSites') saveSettingsToDb(next);
            return next;
        });
    };

    /**
     * addTag / removeTag: build the next state snapshot INSIDE the updater
     * (so it is based on the latest prev), then fire the save via setTimeout
     * so it runs after React has committed the new state. This avoids the
     * stale-closure bug where id=null was used on every subsequent INSERT.
     */
    const addTag = (type, tag) => {
        if (!tag.trim()) return;
        const key = type === 'keyword' ? 'keywords' : 'excludeKeywords';
        setSearchSettings(prev => {
            const next = { ...prev, [key]: [...prev[key], tag.trim()] };
            setTimeout(() => saveSettingsToDb(next), 0);
            return next;
        });
    };

    const removeTag = (type, index) => {
        const key = type === 'keyword' ? 'keywords' : 'excludeKeywords';
        setSearchSettings(prev => {
            const next = { ...prev, [key]: prev[key].filter((_, i) => i !== index) };
            setTimeout(() => saveSettingsToDb(next), 0);
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
            await apiClient.put(`/api/search-settings/sites/${id}`, { enabled: nextEnabled });
        } catch (error) {
            console.error("Failed to update site:", error);
        }
    };

    const addSite = async (name, url) => {
        if (!name || !url) return;

        try {
            const { data } = await apiClient.post('/api/search-settings/sites', { name, url, enabled: true });
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
            await apiClient.delete(`/api/search-settings/sites/${id}`);
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
            await apiClient.put(`/api/search-settings/sites/${id}`, { name, url });
        } catch (error) {
            console.error("Failed to update site:", error);
        }
    };

    const clearResults = () => {
        setSearchSettings(prev => {
            const next = { ...prev, lastResults: [] };
            setTimeout(() => saveSettingsToDb(next), 0);
            return next;
        });
    };

    return { loading, searchSettings, updateSettings, addTag, removeTag, addSite, removeSite, updateSite, toggleSite, clearResults };
}