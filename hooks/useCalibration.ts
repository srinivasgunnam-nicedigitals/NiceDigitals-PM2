import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { CalibrationReport } from '../types';

export const useCalibrationReport = () => {
    return useQuery<CalibrationReport, Error>({
        queryKey: ['calibration'],
        queryFn: async () => {
            const { data } = await api.get('/calibration');
            return data;
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useSetOutcome = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ projectId, actualOutcome }: { projectId: string; actualOutcome: string }) => {
            const { data } = await api.patch(`/calibration/${projectId}/outcome`, { actualOutcome });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['calibration'] });
        },
    });
};
