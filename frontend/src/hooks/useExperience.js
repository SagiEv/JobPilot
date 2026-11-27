import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { getAccessToken } from '../services/apiClient';
import { QUERY_KEYS, experienceQuery } from '../queries/queryDefinitions';

export function useExperience() {
    const queryClient = useQueryClient();

    const { data: { projects = [] } = {}, isLoading: loading } = useQuery({
        ...experienceQuery,
        enabled: !!getAccessToken(),
    });

    const addProjectMutation = useMutation({
        mutationFn: async (data) => {
            const bullets = data.summary.split('\n').filter(l => l.trim());
            const { summary, ...rest } = data;
            const res = await apiClient.post('/api/experience/projects', { ...rest, bullets });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EXPERIENCE });
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
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EXPERIENCE });
        }
    });

    const deleteProjectMutation = useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/api/experience/projects/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EXPERIENCE });
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


    return {
        projects,
        loading,
        addProject,
        updateProject,
        deleteProject
    };
}