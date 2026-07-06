import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { getAccessToken } from '../services/apiClient';

export function useRss() {
    const queryClient = useQueryClient();

    // Fetch Feeds
    const { data: feeds = [], isLoading: feedsLoading } = useQuery({
        enabled: !!getAccessToken(),
        queryKey: ['rssFeeds'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/rss-feeds/feeds');
            return data || [];
        }
    });

    // Fetch Jobs
    const { data: jobs = [], isLoading: jobsLoading } = useQuery({
        enabled: !!getAccessToken(),
        queryKey: ['rssJobs'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/rss-feeds/jobs');
            return data || [];
        }
    });

    // Add Feed
    const addFeedMutation = useMutation({
        mutationFn: async ({ url, category }) => {
            const { data } = await apiClient.post('/api/rss-feeds/feeds', { url, category, enabled: true });
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rssFeeds'] })
    });

    // Update Feed
    const updateFeedMutation = useMutation({
        mutationFn: async ({ id, payload }) => {
            const { data } = await apiClient.put(`/api/rss-feeds/feeds/${id}`, payload);
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rssFeeds'] })
    });

    // Delete Feed
    const deleteFeedMutation = useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/api/rss-feeds/feeds/${id}`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rssFeeds'] })
    });

    const addFeed = async (url, category = 'General') => {
        if (!url) return;
        addFeedMutation.mutate({ url, category });
    };

    const toggleFeed = async (id, currentStatus) => {
        updateFeedMutation.mutate({ id, payload: { enabled: !currentStatus } });
    };

    const deleteFeed = async (id) => {
        deleteFeedMutation.mutate(id);
    };

    const updateFeed = async (id, url, category) => {
        updateFeedMutation.mutate({ id, payload: { url, category } });
    };

    return {
        feeds,
        jobs,
        feedsLoading,
        jobsLoading,
        addFeed,
        toggleFeed,
        deleteFeed,
        updateFeed
    };
}
