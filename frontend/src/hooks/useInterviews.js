import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { getAccessToken } from '../services/apiClient';

export function useInterviews() {
    const queryClient = useQueryClient();

    const { data: interviews = [], isLoading: loading } = useQuery({
        enabled: !!getAccessToken(),
        queryKey: ['interviews'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/interviews');
            return data || [];
        }
    });

    const addInterviewMutation = useMutation({
        mutationFn: async (interview) => {
            const { data } = await apiClient.post('/api/interviews', interview);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['interviews'] });
        }
    });

    const updateInterviewMutation = useMutation({
        mutationFn: async ({ id, interview }) => {
            const { data } = await apiClient.put(`/api/interviews/${id}`, interview);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['interviews'] });
        }
    });

    const deleteInterviewMutation = useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/api/interviews/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['interviews'] });
        }
    });

    const { data: aiReports = [], isLoading: loadingReports } = useQuery({
        enabled: !!getAccessToken(),
        queryKey: ['aiReports'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/interviews/reports');
            return data || [];
        }
    });

    const generateAiReportMutation = useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.post('/api/interviews/analyze');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['aiReports'] });
        }
    });

    const generateAiReport = async () => {
        return generateAiReportMutation.mutateAsync();
    };

    const addInterview = async (newInt) => {
        const interview = {
            ...newInt, // Spread first so it provides the company and date
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