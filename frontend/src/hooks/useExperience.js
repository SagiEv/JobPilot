import { useState, useEffect } from 'react';
import api from '../api';

export function useExperience() {
    const [projects, setProjects] = useState([]);
    const [experienceTextObj, setExperienceTextObj] = useState({ id: null, text: '' });
    const [loading, setLoading] = useState(true);

    const fetchExperience = async () => {
        try {
            const [projRes, textRes] = await Promise.all([
                api.get('/api/experience/projects'),
                api.get('/api/experience/text')
            ]);
            setProjects(projRes.data || []);
            if (textRes.data && textRes.data.text) {
                setExperienceTextObj(textRes.data);
            }
        } catch (error) {
            console.error("Failed to fetch experience data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExperience();
    }, []);

    const addProject = async (data) => {
        const bullets = data.summary.split('\n').filter(l => l.trim());
        const { summary, ...rest } = data;
        try {
            const res = await api.post('/api/experience/projects', { ...rest, bullets });
            setProjects(prev => [res.data, ...prev]);
        } catch (error) {
            console.error("Failed to add project:", error.response?.data || error);
        }
    };

    const updateProject = async (id, updatedData) => {
        const bullets = updatedData.summary.split('\n').filter(l => l.trim());
        const { summary, ...rest } = updatedData;
        const payload = { ...rest, bullets };
        
        setProjects(prev => prev.map(p => p.id === id ? { ...p, ...payload } : p));
        try {
            await api.put(`/api/experience/projects/${id}`, payload);
        } catch (error) {
            console.error("Failed to update project:", error);
        }
    };

    const deleteProject = async (id) => {
        setProjects(prev => prev.filter(p => p.id !== id));
        try {
            await api.delete(`/api/experience/projects/${id}`);
        } catch (error) {
            console.error("Failed to delete project:", error);
        }
    };

    const setExperienceText = async (newText) => {
        setExperienceTextObj(prev => ({ ...prev, text: newText }));
        try {
            const res = await api.put('/api/experience/text', { id: experienceTextObj.id, text: newText });
            if (res.data && res.data.id && !experienceTextObj.id) {
                setExperienceTextObj(res.data);
            }
        } catch (error) {
            console.error("Failed to update experience text:", error);
        }
    };

    return { 
        projects, 
        loading,
        experienceText: experienceTextObj.text, 
        setExperienceText, 
        addProject, 
        updateProject, 
        deleteProject 
    };
}