import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

export function useSkills() {
    const queryClient = useQueryClient();

    const { data: skills = [], isLoading: loading } = useQuery({
        queryKey: ['skills'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/skills');
            return data || [];
        }
    });

    const addSkillMutation = useMutation({
        mutationFn: async ({ name, category, level }) => {
            const { data } = await apiClient.post('/api/skills', { name, category, level });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['skills'] });
        }
    });

    const deleteSkillMutation = useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/api/skills/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['skills'] });
        }
    });

    const addSkill = async (name, category = 'Technical', level = 'Intermediate') => {
        if (!name.trim()) return;
        return addSkillMutation.mutateAsync({ name: name.trim(), category, level });
    };

    const deleteSkill = async (id) => {
        return deleteSkillMutation.mutateAsync(id);
    };

    return { skills, loading, addSkill, deleteSkill };
}