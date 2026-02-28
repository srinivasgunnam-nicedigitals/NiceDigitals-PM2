import { useQuery } from '@tanstack/react-query';
import { backendApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// ============================================================
// useDashboard — Aggregate stats, scores, and rankings.
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

export function useScores() {
  const { currentUser, isAuthenticating } = useAuth();

  return useQuery({
    queryKey: ['scores'],
    queryFn: backendApi.getScores,
    enabled: !!currentUser && !isAuthenticating,
    initialData: [],
  });
}

export function useDevRankings() {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: ['rankings'],
    queryFn: backendApi.getRankings,
    // Refresh every 60s — rankings only change when projects complete
    refetchInterval: 60_000,
    enabled: !!currentUser,
    initialData: [],
  });
}
