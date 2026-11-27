import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { getAccessToken } from '../services/apiClient';
import { QUERY_KEYS, notificationsQuery, unreadCountQuery } from '../queries/queryDefinitions';

export function useNotifications() {
    const queryClient = useQueryClient();

    const {
        data: notifications = [],
        isLoading,
        error,
        refetch,
    } = useQuery({
        ...notificationsQuery,
        enabled: !!getAccessToken(),
        refetchInterval: 60_000, // auto-poll every 60s
    });

    const { data: unreadCountData } = useQuery({
        ...unreadCountQuery,
        enabled: !!getAccessToken(),
        refetchInterval: 60_000,
    });

    const unreadCount = unreadCountData ?? 0;

    const markReadMutation = useMutation({
        mutationFn: (id) => apiClient.put(`/api/notifications/${id}/read`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
        },
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => apiClient.put('/api/notifications/read-all'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
        },
    });

    const markRead = (id) => markReadMutation.mutate(id);
    const markAllRead = () => markAllReadMutation.mutate();

    const revertMutation = useMutation({
        mutationFn: async (id) => {
            const res = await apiClient.post(`/api/notifications/${id}/revert`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPLICATIONS });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_STATS });
        },
    });

    const unrevertMutation = useMutation({
        mutationFn: async (id) => {
            const res = await apiClient.post(`/api/notifications/${id}/unrevert`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPLICATIONS });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_STATS });
        },
    });

    const revertNotification = (id) => revertMutation.mutateAsync(id);
    const unrevertNotification = (id) => unrevertMutation.mutateAsync(id);

    return {
        notifications,
        unreadCount,
        isLoading,
        error,
        refetch,
        markRead,
        markAllRead,
        revertNotification,
        unrevertNotification,
        isReverting: revertMutation.isPending,
        isUnreverting: unrevertMutation.isPending,
    };
}
