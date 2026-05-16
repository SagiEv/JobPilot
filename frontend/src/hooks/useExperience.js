import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

export function useExperience() {
    const queryClient = useQueryClient();

    const { data: { projects = [], experienceTextObj = { id: null, text: '' } } = {}, isLoading: loading } = useQuery({
        queryKey: ['experience'],
        queryFn: async () => {
            const [projRes, textRes] = await Promise.all([
                apiClient.get('/api/experience/projects'),
                apiClient.get('/api/experience/text')
            ]);
            let textObj = { id: null, text: '' };
            if (textRes.data && textRes.data.text) {
                textObj = textRes.data;
            }
            return { projects: projRes.data || [], experienceTextObj: textObj };
        }
    });

    const addProjectMutation = useMutation({
        mutationFn: async (data) => {
            const bullets = data.summary.split('\n').filter(l => l.trim());
            const { summary, ...rest } = data;
            const res = await apiClient.post('/api/experience/projects', { ...rest, bullets });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['experience'] });
        }
    });

    const updateProjectMutation = useMutation({
        mutationFn: async ({ id, updatedData }) => {
            const bullets = updatedData.summary.split('\n').filter(l => l.trim());
            const { summary, ...rest } = updatedData;
            const payload = { ...rest, bullets };
            await apiClient.put(`/api/experience/projects/${id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['experience'] });
        }
    });

    const deleteProjectMutation = useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/api/experience/projects/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['experience'] });
        }
    });

    const updateTextMutation = useMutation({
        mutationFn: async ({ id, text }) => {
            const res = await apiClient.put('/api/experience/text', { id, text });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['experience'] });
        }
    });

    const addProject = async (data) => {
        return addProjectMutation.mutateAsync(data);
    };

    const updateProject = async (id, updatedData) => {
        // Optimistic update
        const bullets = updatedData.summary.split('\n').filter(l => l.trim());
        const { summary, ...rest } = updatedData;
        const payload = { ...rest, bullets };
        
        queryClient.setQueryData(['experience'], (old) => {
            if (!old) return old;
            return {
                ...old,
                projects: old.projects.map(p => p.id === id ? { ...p, ...payload } : p)
            };
        });
        
        return updateProjectMutation.mutateAsync({ id, updatedData });
    };

    const deleteProject = async (id) => {
        // Optimistic update
        queryClient.setQueryData(['experience'], (old) => {
            if (!old) return old;
            return {
                ...old,
                projects: old.projects.filter(p => p.id !== id)
            };
        });
        
        return deleteProjectMutation.mutateAsync(id);
    };

    const setExperienceText = async (newText) => {
        // Optimistic update
        queryClient.setQueryData(['experience'], (old) => {
            if (!old) return old;
            return {
                ...old,
                experienceTextObj: { ...old.experienceTextObj, text: newText }
            };
        });
        
        return updateTextMutation.mutateAsync({ id: experienceTextObj.id, text: newText });
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