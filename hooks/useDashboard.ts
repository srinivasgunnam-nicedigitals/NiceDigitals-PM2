import { useQuery } from '@tanstack/react-query';
import { backendApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// ============================================================
// useDashboard — Aggregate stats for the admin overview.
// All are read-only. These are never mutated by the frontend.
// ============================================================

export function useProjectStats() {
  const { currentUser, isAuthenticating } = useAuth();

  return useQuery({
    queryKey: ['projectStats'],
    queryFn: backendApi.getProjectStats,
    enabled: !!currentUser && !isAuthenticating,
  });
}

// ============================================================
// useLeaderboard — Role-based monthly leaderboard.
// ============================================================

export function useLeaderboard(role: string, month?: number, year?: number) {
  const { currentUser, isAuthenticating } = useAuth();

  return useQuery({
    queryKey: ['leaderboard', role, month, year],
    queryFn: () => backendApi.getLeaderboard(role, month, year),
    refetchInterval: 60_000,
    enabled: !!currentUser && !isAuthenticating,
  });
}
