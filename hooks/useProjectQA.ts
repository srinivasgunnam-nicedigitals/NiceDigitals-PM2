import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backendApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// ============================================================
// useProjectQA — QA feedback and project history.
// Isolated so components only dealing with QA (e.g., the QA
// tab inside ProjectDetailModal) don't import mutation logic
// from the main project hooks.
// ============================================================

export function useRecordQAFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, passed, version }: { id: string; passed: boolean; version: number }) =>
      backendApi.recordQAFeedback(id, passed, version),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'projects',
      });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['project-history', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['scores'] });
    },
  });
}

export function useProjectHistory(projectId: string | null, page = 1, limit = 50) {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: ['project-history', projectId, page],
    queryFn: () => backendApi.getProjectHistory(projectId!, page, limit),
    enabled: !!currentUser && !!projectId,
  });
}
