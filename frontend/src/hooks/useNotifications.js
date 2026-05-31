import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

const QUERY_KEY = 'notifications';

export function useNotifications(limit = 20) {
    const queryClient = useQueryClient();

    const {
        data: notifications = [],
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: [QUERY_KEY, limit],
        queryFn: async () => {
            const res = await apiClient.get(`/api/notifications?limit=${limit}`);
            return res.data || [];
        },
        staleTime: 30_000, // refetch every 30s
        refetchInterval: 60_000, // auto-poll every 60s
    });

    const { data: unreadCountData } = useQuery({
        queryKey: [QUERY_KEY, 'unread-count'],
        queryFn: async () => {
            const res = await apiClient.get('/api/notifications/unread-count');
            return res.data?.count ?? 0;
        },
        staleTime: 30_000,
        refetchInterval: 60_000,
    });

    const unreadCount = unreadCountData ?? 0;

    const markReadMutation = useMutation({
        mutationFn: (id) => apiClient.put(`/api/notifications/${id}/read`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        },
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => apiClient.put('/api/notifications/read-all'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        },
    });

    const markRead = (id) => markReadMutation.mutate(id);
    const markAllRead = () => markAllReadMutation.mutate();

    return {
        notifications,
        unreadCount,
        isLoading,
        error,
        refetch,
        markRead,
        markAllRead,
    };
}
