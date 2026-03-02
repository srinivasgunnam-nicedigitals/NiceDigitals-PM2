import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import { DisciplineSnapshot, User } from '../types';

export interface DisciplineTeamEntry {
    user: User;
    snapshot: DisciplineSnapshot | null;
}

// Fetch user's own discipline data (latest + previous)
export const useMyDiscipline = () => {
    return useQuery<{ latest: DisciplineSnapshot | null, previous: DisciplineSnapshot | null }, Error>({
        queryKey: ['discipline', 'me'],
        queryFn: async () => {
            const { data } = await api.get('/discipline/me');
            return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes (data only changes 1x/day via cron)
    });
};

// Fetch specific user's discipline data (Admin only)
export const useUserDiscipline = (userId: string) => {
    return useQuery<{ latest: DisciplineSnapshot | null, previous: DisciplineSnapshot | null }, Error>({
        queryKey: ['discipline', 'user', userId],
        queryFn: async () => {
            const { data } = await api.get(`/discipline/users/${userId}`);
            return data;
        },
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });
};

// Fetch entire team's latest discipline snapshots (Admin only)
export const useTeamDiscipline = () => {
    return useQuery<DisciplineTeamEntry[], Error>({
        queryKey: ['discipline', 'team'],
        queryFn: async () => {
            const { data } = await api.get('/discipline/team');
            return data;
        },
        staleTime: 5 * 60 * 1000,
    });
};

// Trigger manual computation (Admin only testing)
export const useTriggerDisciplineComputation = () => {
    return useMutation({
        mutationFn: async () => {
            const { data } = await api.post('/discipline/trigger');
            return data;
        },
    });
};
