import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { getAccessToken } from '../services/apiClient';

export function useScrapedJobs() {
    const queryClient = useQueryClient();

    const { data: scrapedJobs = [], isLoading: loading } = useQuery({
        enabled: !!getAccessToken(),
        queryKey: ['scrapedJobs'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/search-settings/scraped-jobs');
            return data;
        }
    });

    const updateJobMutation = useMutation({
        mutationFn: async ({ id, payload }) => {
            const { data } = await apiClient.patch(`/api/search-settings/scraped-jobs/${id}`, payload);
            return data;
        },
        onMutate: async ({ id, payload }) => {
            await queryClient.cancelQueries({ queryKey: ['scrapedJobs'] });
            const previousJobs = queryClient.getQueryData(['scrapedJobs']);

            queryClient.setQueryData(['scrapedJobs'], (old) => {
                if (!old) return old;
                return old.map(job => (job.id === id ? { ...job, ...payload } : job));
            });

            return { previousJobs };
        },
        onError: (err, newTodo, context) => {
            queryClient.setQueryData(['scrapedJobs'], context.previousJobs);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['scrapedJobs'] });
        }
    });

    const removeJobMutation = useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/api/search-settings/scraped-jobs/${id}`);
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['scrapedJobs'] });
            const previousJobs = queryClient.getQueryData(['scrapedJobs']);

            queryClient.setQueryData(['scrapedJobs'], (old) => {
                if (!old) return old;
                return old.filter(job => job.id !== id);
            });

            return { previousJobs };
        },
        onError: (err, newTodo, context) => {
            queryClient.setQueryData(['scrapedJobs'], context.previousJobs);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['scrapedJobs'] });
        }
    });

    const toggleBookmark = (id, currentStatus) => {
        updateJobMutation.mutate({ id, payload: { bookmarked: !currentStatus } });
    };

    const markAsSeen = (id) => {
        updateJobMutation.mutate({ 
            id, 
            payload: { seen: true, seen_at: new Date().toISOString() } 
        });
    };

    const removeJob = (id) => {
        removeJobMutation.mutate(id);
    };

    return {
        scrapedJobs,
        loading,
        toggleBookmark,
        markAsSeen,
        removeJob
    };
}
