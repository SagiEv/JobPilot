import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { getAccessToken } from '../services/apiClient';
import { QUERY_KEYS, scrapedJobsQuery } from '../queries/queryDefinitions';
import { useToast } from '../components/ToastProvider';

export function useScrapedJobs() {
    const queryClient = useQueryClient();
    const { addToast } = useToast() || {};

    const { data: scrapedJobs = [], isLoading: loading } = useQuery({
        ...scrapedJobsQuery,
        enabled: !!getAccessToken(),
    });

    const updateJobMutation = useMutation({
        mutationFn: async ({ id, payload }) => {
            const { data } = await apiClient.patch(`/api/search-settings/scraped-jobs/${id}`, payload);
            return data;
        },
        onMutate: async ({ id, payload }) => {
            await queryClient.cancelQueries({ queryKey: QUERY_KEYS.SCRAPED_JOBS });
            const previousJobs = queryClient.getQueryData(QUERY_KEYS.SCRAPED_JOBS);

            queryClient.setQueryData(QUERY_KEYS.SCRAPED_JOBS, (old) => {
                if (!old) return old;
                return old.map(job => (job.id === id ? { ...job, ...payload } : job));
            });

            return { previousJobs };
        },
        onError: (err, _vars, context) => {
            if (context?.previousJobs) {
                queryClient.setQueryData(QUERY_KEYS.SCRAPED_JOBS, context.previousJobs);
            }
            addToast?.(`Failed to update job: ${err.response?.data?.message || err.message || 'Unknown error'}`, 'error');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SCRAPED_JOBS });
        }
    });

    const removeJobMutation = useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/api/search-settings/scraped-jobs/${id}`);
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: QUERY_KEYS.SCRAPED_JOBS });
            const previousJobs = queryClient.getQueryData(QUERY_KEYS.SCRAPED_JOBS);

            queryClient.setQueryData(QUERY_KEYS.SCRAPED_JOBS, (old) => {
                if (!old) return old;
                return old.filter(job => job.id !== id);
            });

            return { previousJobs };
        },
        onSuccess: () => {
            addToast?.('Removed job from queue', 'info');
        },
        onError: (err, _id, context) => {
            if (context?.previousJobs) {
                queryClient.setQueryData(QUERY_KEYS.SCRAPED_JOBS, context.previousJobs);
            }
            addToast?.(`Failed to remove job: ${err.response?.data?.message || err.message || 'Unknown error'}`, 'error');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SCRAPED_JOBS });
        }
    });

    const bulkRemoveMutation = useMutation({
        mutationFn: async (ids) => {
            const { data } = await apiClient.post('/api/search-settings/scraped-jobs/bulk-delete', { ids });
            return data;
        },
        onMutate: async (ids) => {
            await queryClient.cancelQueries({ queryKey: QUERY_KEYS.SCRAPED_JOBS });
            const previousJobs = queryClient.getQueryData(QUERY_KEYS.SCRAPED_JOBS);
            const idSet = new Set(ids);

            queryClient.setQueryData(QUERY_KEYS.SCRAPED_JOBS, (old) => {
                if (!old) return old;
                return old.filter(job => !idSet.has(job.id));
            });

            return { previousJobs };
        },
        onSuccess: (_data, ids) => {
            addToast?.(`Removed ${ids.length} job${ids.length === 1 ? '' : 's'} from queue`, 'info');
        },
        onError: (err, _ids, context) => {
            if (context?.previousJobs) {
                queryClient.setQueryData(QUERY_KEYS.SCRAPED_JOBS, context.previousJobs);
            }
            addToast?.(`Failed to remove selected jobs: ${err.response?.data?.message || err.message || 'Unknown error'}`, 'error');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SCRAPED_JOBS });
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

    const bulkRemoveJobs = async (ids) => {
        if (!ids?.length) return;
        return bulkRemoveMutation.mutateAsync(ids);
    };

    const bulkMarkSeen = async (ids) => {
        if (!ids?.length) return;
        const seenAt = new Date().toISOString();
        await Promise.allSettled(
            ids.map(id => updateJobMutation.mutateAsync({ id, payload: { seen: true, seen_at: seenAt } }))
        );
        addToast?.(`Marked ${ids.length} job${ids.length === 1 ? '' : 's'} as seen`, 'success');
    };

    const bulkBookmark = async (ids) => {
        if (!ids?.length) return;
        await Promise.allSettled(
            ids.map(id => updateJobMutation.mutateAsync({ id, payload: { bookmarked: true } }))
        );
        addToast?.(`Bookmarked ${ids.length} job${ids.length === 1 ? '' : 's'}`, 'success');
    };

    return {
        scrapedJobs,
        loading,
        toggleBookmark,
        markAsSeen,
        removeJob,
        bulkRemoveJobs,
        bulkMarkSeen,
        bulkBookmark,
        isBulkRemoving: bulkRemoveMutation.isPending,
    };
}
