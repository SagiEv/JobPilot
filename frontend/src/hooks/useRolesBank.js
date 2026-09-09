import { useQuery } from '@tanstack/react-query';
import apiClient, { getAccessToken } from '../services/apiClient';

export function useRolesBank() {
    return useQuery({
        enabled: !!getAccessToken(),
        queryKey: ['rolesBank'],
        queryFn: async () => {
            const response = await apiClient.get('/api/roles-bank');
            return response.data || [];
        }
    });
}
