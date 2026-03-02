import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { ExecutionHealth } from '../types';

export const useExecutionHealth = (projectId: string) => {
    return useQuery<ExecutionHealth, Error>({
        queryKey: ['executionHealth', projectId],
        queryFn: async () => {
            const { data } = await api.get(`/projects/${projectId}/execution-health`);
            return data;
        },
        enabled: !!projectId,
        staleTime: 2 * 60 * 1000, // 2 minutes — on-demand compute, not snapshot
    });
};
