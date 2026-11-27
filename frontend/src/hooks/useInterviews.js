import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { getAccessToken } from '../services/apiClient';
import { useToast } from '../components/ToastProvider';
import { QUERY_KEYS, interviewsQuery, aiReportsQuery } from '../queries/queryDefinitions';

export function useInterviews() {
    const queryClient = useQueryClient();
    const { addToast } = useToast() || {};

    const { data: interviews = [], isLoading: loading } = useQuery({
        ...interviewsQuery,
        enabled: !!getAccessToken(),
    });

    const addInterviewMutation = useMutation({
        mutationFn: async (interview) => {
            const { data } = await apiClient.post('/api/interviews', interview);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INTERVIEWS });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPLICATION_HISTORY() });
            addToast?.('Interview insight saved', 'success');
        },
        onError: (err) => {
            addToast?.(`Failed to save insight: ${err.response?.data?.message || err.message || 'Unknown error'}`, 'error');
        }
    });

    const updateInterviewMutation = useMutation({
        mutationFn: async ({ id, interview }) => {
            const { data } = await apiClient.put(`/api/interviews/${id}`, interview);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INTERVIEWS });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPLICATION_HISTORY() });
            addToast?.('Interview insight updated', 'success');
        },
        onError: (err) => {
            addToast?.(`Failed to update insight: ${err.response?.data?.message || err.message || 'Unknown error'}`, 'error');
        }
    });

    const deleteInterviewMutation = useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/api/interviews/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INTERVIEWS });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPLICATION_HISTORY() });
            addToast?.('Interview insight deleted', 'info');
        },
        onError: (err) => {
            addToast?.(`Failed to delete insight: ${err.response?.data?.message || err.message || 'Unknown error'}`, 'error');
        }
    });

    const { data: aiReports = [], isLoading: loadingReports } = useQuery({
        ...aiReportsQuery,
        enabled: !!getAccessToken(),
    });

    const generateAiReportMutation = useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.post('/api/interviews/analyze');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AI_REPORTS });
        }
    });

    const generateAiReport = async () => {
        return generateAiReportMutation.mutateAsync();
    };

    const addInterview = async (newInt) => {
        const interview = {
            ...newInt, // Spread first so it provides the company and date
            application_id: newInt.application_id ? Number(newInt.application_id) : null,
            // Then define the arrays so they override the strings in newInt
            keep: typeof newInt.keep === 'string'
                ? newInt.keep.split('\n').filter(line => line.trim())
                : [],
            improve: typeof newInt.improve === 'string'
                ? newInt.improve.split('\n').filter(line => line.trim())
                : []
        };
        return addInterviewMutation.mutateAsync(interview);
    };

    const updateInterview = async (id, updatedInt) => {
        const interview = {
            ...updatedInt,
            application_id: updatedInt.application_id ? Number(updatedInt.application_id) : null,
            keep: typeof updatedInt.keep === 'string'
                ? updatedInt.keep.split('\n').filter(line => line.trim())
                : updatedInt.keep,
            improve: typeof updatedInt.improve === 'string'
                ? updatedInt.improve.split('\n').filter(line => line.trim())
                : updatedInt.improve
        };
        return updateInterviewMutation.mutateAsync({ id, interview });
    };

    const deleteInterview = async (id) => {
        return deleteInterviewMutation.mutateAsync(id);
    };

    return { 
        interviews, 
        loading, 
        addInterview, 
        updateInterview, 
        deleteInterview,
        aiReports,
        loadingReports,
        generateAiReport,
        isGeneratingReport: generateAiReportMutation.isPending
    };
}