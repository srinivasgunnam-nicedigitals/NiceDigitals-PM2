import { useQuery } from '@tanstack/react-query';
import { backendApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// ============================================================
// useProjectQA — QA feedback and project history.
// Isolated so components only dealing with QA (e.g., the QA
// tab inside ProjectDetailModal) don't import mutation logic
// from the main project hooks.
// ============================================================

// useRecordQAFeedback — REMOVED
// QA rejections now use the unified advanceStage pipeline
// with structured revertReasonCategory + revertReasonNote.

export function useProjectHistory(projectId: string | null, page = 1, limit = 50) {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: ['project-history', projectId, page],
    queryFn: () => backendApi.getProjectHistory(projectId!, page, limit),
    enabled: !!currentUser && !!projectId,
  });
}
