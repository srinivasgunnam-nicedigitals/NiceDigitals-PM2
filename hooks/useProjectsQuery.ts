import { useQuery } from '@tanstack/react-query';
import { keepPreviousData } from '@tanstack/react-query';
import { backendApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Project } from '../types';

// ============================================================
// useProjectsQuery — Read-only project data fetching.
// This hook is the ONLY place that fetches the project list.
// It is intentionally separated from mutations so components
// that only display data don't import mutation logic.
// ============================================================

export interface ProjectFilters {
  status?: string;
  priority?: string;
  clientName?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Normalized shape — components never see the raw envelope
export interface ProjectsResult {
  projects: Project[];
  meta: PaginationMeta;
}

const DEFAULT_META: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
};

export function useProjectsQuery(
  page: number = 1,
  limit: number = 10,
  filters: ProjectFilters = {}
) {
  const { currentUser, isAuthenticating } = useAuth();

  const query = useQuery({
    queryKey: ['projects', { page, limit, ...filters }],
    queryFn: async (): Promise<ProjectsResult> => {
      const response = await backendApi.getProjects(page, limit, filters);
      return {
        projects: response.data ?? [],
        // Normalize the meta envelope — components never care about backend structure
        meta: response.meta
          ? { ...DEFAULT_META, ...response.meta }
          : DEFAULT_META,
      };
    },
    placeholderData: keepPreviousData,
    enabled: !!currentUser && !isAuthenticating,
  });

  return {
    ...query,
    // Always provide typed, normalized values — never undefined
    projects: query.data?.projects ?? [],
    meta: query.data?.meta ?? DEFAULT_META,
  };
}

export function useProjectStats() {
  const { currentUser, isAuthenticating } = useAuth();

  return useQuery({
    queryKey: ['projectStats'],
    queryFn: backendApi.getProjectStats,
    enabled: !!currentUser && !isAuthenticating,
  });
}

export function useClientNames() {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: ['clientNames'],
    queryFn: backendApi.getClientNames,
    enabled: !!currentUser,
    staleTime: 30 * 1000,
  });
}

export function useSingleProject(projectId: string | null) {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => backendApi.getProject(projectId!),
    enabled: !!currentUser && !!projectId,
  });
}
