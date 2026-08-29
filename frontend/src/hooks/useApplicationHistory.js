import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { getAccessToken } from '../services/apiClient';

export function useApplicationHistory(applicationId) {
    const queryClient = useQueryClient();

    const { data: history = [], isLoading } = useQuery({
        enabled: !!getAccessToken() && !!applicationId,
        queryKey: ['applicationHistory', applicationId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/api/applications/${applicationId}/history`);
            return data || [];
        }
    });

    const addNoteMutation = useMutation({
        mutationFn: async ({ notes, withWho }) => {
            await apiClient.post(`/api/applications/${applicationId}/history/note`, {
                notes,
                with_who: withWho
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applicationHistory', applicationId] });
        }
    });

    const addNote = async (notes, withWho) => {
        return addNoteMutation.mutateAsync({ notes, withWho });
    };

    return { history, isLoading, addNote };
}
