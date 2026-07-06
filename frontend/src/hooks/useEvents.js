import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { getAccessToken } from '../services/apiClient';

export function useEvents() {
    const queryClient = useQueryClient();

    const { data: events = [], isLoading: loading, refetch } = useQuery({
        enabled: !!getAccessToken(),
        queryKey: ['events'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/events');
            return data || [];
        }
    });

    const addEventMutation = useMutation({
        mutationFn: async (newEvent) => {
            const { data } = await apiClient.post('/api/events', newEvent);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
        }
    });

    const updateEventMutation = useMutation({
        mutationFn: async ({ id, updatedEvent }) => {
            const { data } = await apiClient.put(`/api/events/${id}`, updatedEvent);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
        }
    });

    const deleteEventMutation = useMutation({
        mutationFn: async (id) => {
            await apiClient.delete(`/api/events/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
        }
    });

    const addEvent = async (newEvent) => {
        return addEventMutation.mutateAsync(newEvent);
    };

    const updateEvent = async (id, updatedEvent) => {
        return updateEventMutation.mutateAsync({ id, updatedEvent });
    };

    const deleteEvent = async (id) => {
        return deleteEventMutation.mutateAsync(id);
    };

    return { 
        events, 
        loading, 
        addEvent, 
        updateEvent, 
        deleteEvent, 
        refetch 
    };
}
