import { useState, useEffect } from 'react';
import api from '../api';

export function useSkills() {
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSkills = async () => {
        try {
            const { data } = await api.get('/api/skills');
            setSkills(data || []);
        } catch (error) {
            console.error("Failed to fetch skills:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSkills();
    }, []);

    const addSkill = async (name, category = 'Technical', level = 'Intermediate') => {
        if (!name.trim()) return;
        
        try {
            const { data } = await api.post('/api/skills', {
                name: name.trim(),
                category,
                level
            });
            setSkills(prev => [...prev, data]);
        } catch (error) {
            console.error("Failed to add skill:", error);
        }
    };

    const deleteSkill = async (id) => {
        setSkills(prev => prev.filter(s => s.id !== id));
        try {
            await api.delete(`/api/skills/${id}`);
        } catch (error) {
            console.error("Failed to delete skill:", error);
        }
    };

    return { skills, loading, addSkill, deleteSkill };
}