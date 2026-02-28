import { useMutation, useQueryClient } from '@tanstack/react-query';
import { backendApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Project, ProjectStage } from '../types';

// ============================================================
// useProjectMutations — All write operations for projects.
// Intentionally separated from query hooks. Import only this
// hook in components that create, update, or delete projects.
// ============================================================

// Precision invalidation helper: only marks project-related
// queries as stale. Does NOT blow away unrelated caches.
const invalidateProjects = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] === 'projects',
  });
};

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (project: Partial<Project>) => backendApi.createProject(project),
    onSuccess: () => {
      invalidateProjects(queryClient);
      queryClient.invalidateQueries({ queryKey: ['clientNames'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Project> & { version: number; newHistoryItem?: any } }) =>
      backendApi.updateProject(id, updates),
    onSuccess: (_, variables) => {
      invalidateProjects(queryClient);
      // Also invalidate the single-project detail cache
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['project-history', variables.id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => backendApi.deleteProject(id),
    onSuccess: () => {
      invalidateProjects(queryClient);
      queryClient.invalidateQueries({ queryKey: ['clientNames'] });
    },
  });
}

export function useAdvanceStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, nextStage, version }: { id: string; nextStage: ProjectStage; version: number }) =>
      backendApi.advanceProjectStage(id, nextStage, version),
    onSuccess: (_, variables) => {
      invalidateProjects(queryClient);
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['project-history', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['scores'] });
    },
  });
}

export function useBatchProjects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: {
      operation: 'UPDATE_STAGE' | 'ASSIGN_USER' | 'ARCHIVE' | 'DELETE';
      projectIds: string[];
      payload: Record<string, any>;
    }) => backendApi.batchUpdateProjects(request),
    onSuccess: () => {
      invalidateProjects(queryClient);
    },
  });
}

export function useChangeDeadline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: {
      projectId: string;
      data: { newDeadline: string; justification: string; confirm: boolean; version: number }
    }) => backendApi.changeDeadline(projectId, data),
    onSuccess: (_, variables) => {
      invalidateProjects(queryClient);
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
  });
}

export function useReassignLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: {
      projectId: string;
      data: { role: 'DESIGN' | 'DEV' | 'QA'; userId: string; version: number }
    }) => backendApi.reassignLead(projectId, data),
    onSuccess: (_, variables) => {
      invalidateProjects(queryClient);
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
  });
}
