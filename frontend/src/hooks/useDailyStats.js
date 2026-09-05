import { useQuery } from '@tanstack/react-query';
import apiClient, { getAccessToken } from '../services/apiClient';

export function useDailyStats() {
    return useQuery({
        enabled: !!getAccessToken(),
        queryKey: ['dailyStats'],
        queryFn: async () => {
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
            
            const { data } = await apiClient.get(
                `/api/applications/stats/daily?start=${startOfDay.toISOString()}&end=${endOfDay.toISOString()}`
            );
            return data;
        }
    });
}
