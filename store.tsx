
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { backendApi } from './services/api';
import { Project, User, UserRole, ProjectStage, ScoreEntry, DevPerformance, Priority, Comment, HistoryItem } from './types';
import { INITIAL_CHECKLISTS } from './constants';
import { isSameMonth } from 'date-fns';
import type { Notification } from './components/NotificationPanel';
import { useModal } from './hooks/useModal';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  projects: Project[];
  scores: ScoreEntry[];
  clients: string[];
  isLoading: boolean;
  setCurrentUser: (user: User | null) => void;
  addProject: (p: Partial<Project>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  addUser: (u: User) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  addComment: (projectId: string, text: string) => void;
  archiveProject: (id: string) => void;
  unarchiveProject: (id: string) => void;
  advanceStage: (id: string, nextStage: ProjectStage, userId: string) => void;
  recordQAFeedback: (id: string, passed: boolean, userId: string) => void;
  regressToDev: (id: string, userId: string) => void;
  getDevRankings: () => DevPerformance[];
  bulkUpdateStage: (projectIds: string[], stage: ProjectStage) => void;
  bulkAssignUser: (projectIds: string[], userId: string, role: 'designer' | 'dev' | 'qa') => void;
  bulkArchiveProjects: (projectIds: string[]) => void;
  bulkDeleteProjects: (projectIds: string[]) => void;
  deleteProject: (id: string, confirmation: string) => void;
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  clearAllNotifications: () => void;

  // Pagination
  page: number;
  setPage: (page: number) => void;
  paginationMeta: { total: number; totalPages: number; page: number; limit: number };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PROJECTS: 'nice_digital_projects_v4',
  USERS: 'nice_digital_users_v4',
  SCORES: 'nice_digital_scores_v4',
  CURRENT_USER: 'nice_digital_current_user_v4'
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const { showAlert, showPrompt } = useModal();

  // --- STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return saved ? JSON.parse(saved) : null;
  });

  // --- QUERIES ---
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: backendApi.getUsers,
    initialData: [],
    refetchOnWindowFocus: true,
    enabled: !!currentUser
  });

  // --- PAGINATION STATE ---
  const [page, setPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({
    total: 0,
    totalPages: 1,
    page: 1,
    limit: 10
  });

  const { data: projectData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', page],
    queryFn: () => backendApi.getProjects(page, 10), // Default 10 items per page
    placeholderData: keepPreviousData,
    enabled: !!currentUser
  });

  // Extract projects and update meta effect
  const projects = projectData?.data || [] as Project[];

  // Sync meta
  useEffect(() => {
    if (projectData?.meta) {
      setPaginationMeta(projectData.meta);
    }
  }, [projectData?.meta]);

  const { data: scores = [] } = useQuery({
    queryKey: ['scores'],
    queryFn: backendApi.getScores,
    initialData: [] as ScoreEntry[],
    enabled: !!currentUser
  });



  const isLoading = usersLoading || projectsLoading;

  // --- MUTATIONS ---

  const addProjectMutation = useMutation({
    mutationFn: backendApi.createProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      backendApi.updateProject(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      await queryClient.cancelQueries({ queryKey: ['project', id] });

      // Snapshot previous values
      // We need to be specific about the page we are on for the list update
      const previousProjects = queryClient.getQueryData<{ data: Project[], meta: any }>(['projects', page]);
      const previousProject = queryClient.getQueryData<Project>(['project', id]);

      // Optimistically update list
      if (previousProjects) {
        queryClient.setQueryData<{ data: Project[], meta: any }>(['projects', page], (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((p) => {
              if (p.id === id) {
                const { newHistoryItem, ...actualUpdates } = updates;
                return { ...p, ...actualUpdates };
              }
              return p;
            })
          };
        });
      }

      // Optimistically update single project (Critical for Modal)
      if (previousProject) {
        queryClient.setQueryData<Project>(['project', id], (old) => {
          if (!old) return old;
          const { newHistoryItem, ...actualUpdates } = updates;
          return { ...old, ...actualUpdates };
        });
      }

      // Return context
      return { previousProjects, previousProject };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects', page], context.previousProjects);
      }
      if (context?.previousProject) {
        queryClient.setQueryData(['project', newTodo.id], context.previousProject);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['project-history', variables.id] });
      }
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: backendApi.deleteProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ projectId, comment }: { projectId: string; comment: any }) =>
      backendApi.addComment(projectId, comment),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-comments', variables.projectId] });
    }
  });

  const addUserMutation = useMutation({
    mutationFn: backendApi.addUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showAlert({ title: 'Success', message: 'User added successfully', variant: 'success' });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || 'Failed to add user';
      showAlert({ title: 'Error', message: msg, variant: 'error' });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: backendApi.deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Partial<User> }) =>
      backendApi.updateUser(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showAlert({ title: 'Success', message: 'User updated successfully', variant: 'success' });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error || 'Failed to update user';
      showAlert({ title: 'Error', message: msg, variant: 'error' });
    }
  });

  // addScoreMutation removed - scores are now created server-side only
  // via advanceProjectStage and recordQAFeedback endpoints

  // --- CONTEXT IMPLEMENTATION (Adapting to Mutations) ---

  const addProject = async (p: Partial<Project>) => {
    if (currentUser?.role !== UserRole.ADMIN) {
      await showAlert({
        title: 'Permission Denied',
        message: 'Only Administrators can create projects.',
        variant: 'error'
      });
      return;
    }

    const newProject = {
      name: p.name!,
      clientName: p.clientName!,
      scope: p.scope,
      priority: p.priority!,
      assignedDesignerId: p.assignedDesignerId,
      assignedDevManagerId: p.assignedDevManagerId,
      assignedQAId: p.assignedQAId,

      // id, createdAt, stage, history are generated by backend
      // Convert YYYY-MM-DD to ISO-8601 DateTime for Prisma
      overallDeadline: p.overallDeadline
        ? new Date(p.overallDeadline).toISOString()
        : new Date().toISOString(),
      designChecklist: INITIAL_CHECKLISTS.DESIGN.map(i => ({ ...i, completed: false })),
      devChecklist: INITIAL_CHECKLISTS.DEVELOPMENT.map(i => ({ ...i, completed: false })),
      qaChecklist: INITIAL_CHECKLISTS.QA.map(i => ({ ...i, completed: false })),
      finalChecklist: INITIAL_CHECKLISTS.FINAL.map(i => ({ ...i, completed: false })),
    };
    addProjectMutation.mutate(newProject as Project);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    // Permission check for assignments
    if (updates.assignedDesignerId || updates.assignedDevManagerId || updates.assignedQAId) {
      if (currentUser?.role !== UserRole.ADMIN) {
        showAlert({
          title: 'Permission Denied',
          message: 'Only Administrators can assign team members.',
          variant: 'error'
        });
        return;
      }
    }

    updateProjectMutation.mutate({
      id,
      updates
    });
  };

  const deleteProject = async (id: string, confirmation: string) => {
    if (currentUser?.role !== UserRole.ADMIN) {
      await showAlert({
        title: 'Permission Denied',
        message: 'Only Administrators can delete projects.',
        variant: 'error'
      });
      return;
    }
    if (confirmation !== 'DELETE') {
      await showAlert({
        title: 'Verification Failed',
        message: 'Deletion cancelled. You must type DELETE to confirm.',
        variant: 'warning'
      });
      return;
    }

    deleteProjectMutation.mutate(id);
  };

  const archiveProject = (id: string) => {
    if (!currentUser) return;
    advanceStage(id, ProjectStage.COMPLETED, currentUser.id);
  };

  const unarchiveProject = (id: string) => {
    if (!currentUser || currentUser.role !== UserRole.ADMIN) return;
    // Restore to ADMIN_REVIEW stage and clear completedAt
    const historyItem = {
      stage: ProjectStage.ADMIN_REVIEW,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      action: 'Project Restored from Archive'
    };

    updateProjectMutation.mutate({
      id,
      updates: {
        stage: ProjectStage.ADMIN_REVIEW,
        completedAt: null,
        newHistoryItem: historyItem
      }
    });
  };

  const addComment = (projectId: string, text: string) => {
    if (!currentUser) return;
    const newComment = {
      text,
      // Backend assigns id, timestamp, and validates user
      // We send minimal payload
    };
    addCommentMutation.mutate({ projectId, comment: newComment });
  };

  const addUser = (u: User) => {
    if (currentUser?.role !== UserRole.ADMIN) {
      alert("Only Administrators can add users.");
      return;
    }
    addUserMutation.mutate(u);
  };

  const deleteUser = (userId: string) => deleteUserMutation.mutate(userId);

  const updateUser = (userId: string, updates: Partial<User>) => {
    if (currentUser?.role !== UserRole.ADMIN) {
      showAlert({
        title: 'Permission Denied',
        message: 'Only Administrators can update users.',
        variant: 'error'
      });
      return;
    }
    updateUserMutation.mutate({ userId, updates });
  };

  const recordQAFeedback = async (id: string, passed: boolean, userId: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    if (!project.assignedDevManagerId) {
      showAlert({
        title: 'Dev Lead Required',
        message: 'Please assign a Dev Lead in the Brief tab before recording QA feedback. Rewards and penalties must be assigned to a team member.',
        variant: 'warning'
      });
      return;
    }

    try {
      // Call backend API which handles:
      // - Stage advancement (ADMIN_REVIEW on pass, DEVELOPMENT on fail)
      // - QA fail count increment
      // - Checklist resets
      // - History entries
      // - Score creation (server-side)
      await backendApi.recordQAFeedback(id, passed);

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['scores'] });
      queryClient.invalidateQueries({ queryKey: ['project-history', id] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to record QA feedback';
      showAlert({ title: 'Error', message: msg, variant: 'error' });
    }
  };

  // Manual regression is now deprecated in favor of QA flow, 
  // but if needed, it should be a dedicated backend endpoint.
  // For now, removing to enforce strict process.
  const regressToDev = (id: string, userId: string) => {
    showAlert({ title: 'Deprecated', message: 'Use QA Feedback to return to development.', variant: 'info' });
  };

  const advanceStage = async (id: string, nextStage: ProjectStage, userId: string) => {
    try {
      // Call backend API which handles:
      // - Stage transitions
      // - Permission checks
      // - History entries
      // - Server-side scoring (points, bonuses, penalties)
      await backendApi.advanceProjectStage(id, nextStage);

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['scores'] });
      queryClient.invalidateQueries({ queryKey: ['project-history', id] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });

      // Notifications logic should ideally be server-sent events or polled
      // For now, we rely on the backend to handle the state, and polling/refetching updates the UI.

    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to advance project stage';
      showAlert({ title: 'Error', message: msg, variant: 'error' });
    }
  };

  // Keep derived state logic (getDevRankings, etc.) as is, since it depends on 'projects' which is now from React Query
  // Note: We need to memoize clients same as before

  const clients = useMemo(() => {
    const names = projects.map((p: Project) => p.clientName);
    return Array.from(new Set(names)).sort();
  }, [projects]);




  // Persist Current User (Local)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
  }, [currentUser]);

  // Bulk operations (Adapting to mutations)
  const bulkUpdateStage = useCallback((projectIds: string[], stage: ProjectStage) => {
    // Ideally we have a bulk API, but for now loop
    projectIds.forEach(id => {
      // We can re-use updateProject or call mutation directly
      // Simple stage update
      updateProjectMutation.mutate({ id, updates: { stage } });
    });
  }, [updateProjectMutation]);

  const bulkAssignUser = useCallback((projectIds: string[], userId: string, role: 'designer' | 'dev' | 'qa') => {
    projectIds.forEach(id => {
      const updates: any = {};
      if (role === 'designer') updates.assignedDesignerId = userId;
      else if (role === 'dev') updates.assignedDevManagerId = userId;
      else updates.assignedQAId = userId;

      updateProject(id, updates); // Use wrapper to handle history
    });
  }, [updateProject]); // Depend on wrapper

  const bulkArchiveProjects = useCallback((projectIds: string[]) => {
    if (!currentUser) return;
    projectIds.forEach(id => advanceStage(id, ProjectStage.COMPLETED, currentUser.id));
  }, [currentUser, advanceStage]); // Depend on wrapper

  const bulkDeleteProjects = useCallback((projectIds: string[]) => {
    projectIds.forEach(id => deleteProjectMutation.mutate(id));
  }, [deleteProjectMutation]);

  // Notifications Query
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: backendApi.getNotifications,
    initialData: [],
    refetchInterval: 30000, // Poll every 30s
    enabled: !!currentUser
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: backendApi.markNotificationAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markAllReadMutation = useMutation({
    mutationFn: backendApi.markAllNotificationsAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const clearNotificationsMutation = useMutation({
    mutationFn: backendApi.clearNotifications,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  // Client-side 'addNotification' is deprecated for persistent storage, 
  // but kept if we need to show immediate alerts. 
  // However, for "Lawsuit Grade" Architecture, we removed local storage.
  // We will stub it out to logging or toast, as persistence is now DB responsibility.
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    // In a real app, this would be a POST to /api/notifications if generated by client,
    // or strictly generated by backend side-effects.
    // For now, we rely on backend side-effects for critical notifications.
    console.log('Client-side notification generated (logging only):', notification);
    showAlert({ title: notification.title, message: notification.message, variant: 'info' });
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    markNotificationReadMutation.mutate(id);
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, []);

  const clearAllNotifications = useCallback(() => {
    clearNotificationsMutation.mutate();
  }, []);

  const { data: rankings = [] } = useQuery({
    queryKey: ['rankings'],
    queryFn: backendApi.getRankings,
    initialData: [],
    // Refetch often as scores change
    refetchInterval: 60000,
    enabled: !!currentUser
  });

  const getDevRankings = useCallback(() => {
    return rankings;
  }, [rankings]);

  return (
    <AppContext.Provider value={{
      currentUser, users, projects, scores, clients, isLoading, setCurrentUser,
      addProject, updateProject, addUser, updateUser, deleteUser, addComment, archiveProject, unarchiveProject, advanceStage, recordQAFeedback, regressToDev, getDevRankings,
      bulkUpdateStage, bulkAssignUser, bulkArchiveProjects, bulkDeleteProjects, deleteProject,
      notifications, addNotification, markNotificationAsRead, markAllNotificationsAsRead, clearAllNotifications,
      page, setPage, paginationMeta
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
