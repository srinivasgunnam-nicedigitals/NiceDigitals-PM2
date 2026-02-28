import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backendApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// ============================================================
// useProjectComments — Comments for a specific project.
// ============================================================

export function useProjectComments(projectId: string | null, page = 1, limit = 50) {
  const { currentUser } = useAuth();

  const query = useQuery({
    queryKey: ['project-comments', projectId, page],
    queryFn: () => backendApi.getProjectComments(projectId!, page, limit),
    enabled: !!currentUser && !!projectId,
  });

  return {
    ...query,
    comments: query.data?.data ?? [],
    meta: query.data?.meta ?? null,
  };
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, text }: { projectId: string; text: string }) =>
      backendApi.addComment(projectId, { text } as any),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-comments', variables.projectId] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, commentId }: { projectId: string; commentId: string }) =>
      backendApi.deleteComment(projectId, commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-comments', variables.projectId] });
    },
  });
}
