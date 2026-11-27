import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { getAccessToken } from '../services/apiClient';
import { useToast } from '../components/ToastProvider';

export function useApplicationHistory(applicationId) {
    const queryClient = useQueryClient();
    const { addToast } = useToast() || {};

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
            addToast?.('Note added to activity log', 'success');
        },
        onError: (err) => {
            addToast?.(`Failed to add note: ${err.response?.data?.error || err.message || 'Unknown error'}`, 'error');
        }
    });

    const addNote = async (notes, withWho) => {
        return addNoteMutation.mutateAsync({ notes, withWho });
    };

    return { history, isLoading, addNote };
}
