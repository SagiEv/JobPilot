import { useQuery } from '@tanstack/react-query';
import { getAccessToken } from '../services/apiClient';
import { dailyStatsQuery } from '../queries/queryDefinitions';

export function useDailyStats() {
    return useQuery({
        ...dailyStatsQuery,
        enabled: !!getAccessToken(),
    });
}
