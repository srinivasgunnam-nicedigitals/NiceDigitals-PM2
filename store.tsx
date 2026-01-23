
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backendApi } from './services/api';
import { Project, User, UserRole, ProjectStage, ScoreEntry, DevPerformance, Priority, Comment, HistoryItem } from './types';
import { SCORING_RULES, INITIAL_CHECKLISTS } from './constants';
import { differenceInDays, isSameMonth, parseISO } from 'date-fns';
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

  // --- QUERIES ---
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: backendApi.getUsers,
    initialData: [],
    refetchOnWindowFocus: true
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: backendApi.getProjects,
    initialData: [] as Project[]
  });

  const { data: scores = [] } = useQuery({
    queryKey: ['scores'],
    queryFn: backendApi.getScores,
    initialData: [] as ScoreEntry[]
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return saved ? JSON.parse(saved) : null;
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
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['projects'] });

      // Snapshot the previous value
      const previousProjects = queryClient.getQueryData<Project[]>(['projects']);

      // Optimistically update to the new value
      if (previousProjects) {
        queryClient.setQueryData<Project[]>(['projects'], (old) => {
          if (!old) return [];
          return old.map((p) => {
            if (p.id === id) {
              // Create a shallow merge of updates, excluding keys that shouldn't be directly merged like newHistoryItem
              // logic matches what backend roughly does, but purely for UI responsiveness
              const { newHistoryItem, ...actualUpdates } = updates;

              // Handle checklist arrays or other complex objects if needed, but spread usually works for top level
              // Note: actualUpdates might contain { designChecklist: [...] } which overrides p.designChecklist

              const updatedProject = { ...p, ...actualUpdates };

              // Optimistically add history item if present (visual flair, optional but nice)
              if (newHistoryItem) {
                updatedProject.history = [...updatedProject.history, newHistoryItem];
              }

              return updatedProject;
            }
            return p;
          });
        });
      }

      // Return a context object with the snapshotted value
      return { previousProjects };
    },
    onError: (err, newTodo, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousProjects) {
        queryClient.setQueryData(['projects'], context.previousProjects);
      }
    },
    onSettled: () => {
      // Always refetch after error or success:
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: backendApi.deleteProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ projectId, comment }: { projectId: string; comment: any }) =>
      backendApi.addComment(projectId, comment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
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

  const addScoreMutation = useMutation({
    mutationFn: backendApi.addScore,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scores'] })
  });

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
      ...p,
      id: p.id || `p-${Date.now()}`,
      createdAt: new Date().toISOString(),
      stage: ProjectStage.UPCOMING,
      // Convert YYYY-MM-DD to ISO-8601 DateTime for Prisma
      overallDeadline: p.overallDeadline
        ? new Date(p.overallDeadline).toISOString()
        : new Date().toISOString(),
      designChecklist: INITIAL_CHECKLISTS.DESIGN.map(i => ({ ...i, completed: false })),
      devChecklist: INITIAL_CHECKLISTS.DEVELOPMENT.map(i => ({ ...i, completed: false })),
      qaChecklist: INITIAL_CHECKLISTS.QA.map(i => ({ ...i, completed: false })),
      finalChecklist: INITIAL_CHECKLISTS.FINAL.map(i => ({ ...i, completed: false })),
      history: [{
        stage: ProjectStage.UPCOMING,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        action: 'Project Created'
      }]
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

    let historyUpdate = undefined;

    if (updates.assignedDesignerId || updates.assignedDevManagerId || updates.assignedQAId) {
      const action = updates.assignedDesignerId ? 'Designer Assigned' :
        updates.assignedDevManagerId ? 'Dev Manager Assigned' : 'QA Engineer Assigned';

      historyUpdate = {
        stage: project.stage,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        action
      };
    }

    updateProjectMutation.mutate({
      id,
      updates: { ...updates, newHistoryItem: historyUpdate }
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
      id: `c-${Date.now()}`,
      userId: currentUser.id,
      text,
      timestamp: new Date().toISOString()
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

  const recordQAFeedback = (id: string, passed: boolean, userId: string) => {
    const project = projects.find(p => p.id === id);
    if (!project || !project.assignedDevManagerId) return;

    if (passed) {
      advanceStage(id, ProjectStage.ADMIN_REVIEW, userId);
      if (project.qaFailCount === 0) {
        // Add score for QA First Pass
        addScoreMutation.mutate({
          projectId: project.id,
          userId: project.assignedDevManagerId,
          points: SCORING_RULES.QA_FIRST_PASS,
          reason: 'QA First Pass Bonus',
          date: new Date().toISOString()
        } as ScoreEntry);
      }
    } else {
      // Failed
      const snapshot = [...project.qaChecklist];
      const resetQA = project.qaChecklist.map(i => ({ ...i, completed: false }));

      const historyItem = {
        stage: ProjectStage.QA,
        timestamp: new Date().toISOString(),
        userId,
        action: 'QA Failed - Returned to Dev Manager',
        rejectionSnapshot: snapshot
      };

      updateProjectMutation.mutate({
        id,
        updates: {
          stage: ProjectStage.DEVELOPMENT,
          qaFailCount: (project.qaFailCount || 0) + 1,
          qaChecklist: resetQA, // Optional: Reset QA checklist or Dev checklist based on depth of failure
          newHistoryItem: historyItem
        }
      });

      // Deduction for failure
      addScoreMutation.mutate({
        projectId: project.id,
        userId: project.assignedDevManagerId,
        points: SCORING_RULES.QA_REJECTION,
        reason: 'QA Rejection Penalty',
        date: new Date().toISOString()
      } as ScoreEntry);
    }
  };

  const regressToDev = (id: string, userId: string) => {
    // This function might be deprecated in favor of recordQAFeedback(false) logic, 
    // but kept if manual regression outside QA flow is needed.
    const project = projects.find(p => p.id === id);
    if (!project) return;

    updateProjectMutation.mutate({
      id,
      updates: {
        stage: ProjectStage.DEVELOPMENT,
        newHistoryItem: {
          stage: project.stage,
          timestamp: new Date().toISOString(),
          userId,
          action: 'Sent back to Development (Manual)'
        }
      }
    });
  };

  const advanceStage = (id: string, nextStage: ProjectStage, userId: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    // Linear Progression Validation
    // UPCOMING -> DESIGN -> DEVELOPMENT -> QA -> ADMIN_REVIEW -> COMPLETED
    // Note: The UI usually supplies the correct 'nextStage', but we can enforce it if needed.

    const historyEntry = {
      stage: project.stage,
      timestamp: new Date().toISOString(),
      userId,
      action: `Transition to ${nextStage.replace(/_/g, ' ')}`
    };

    let completedAt = undefined;

    // Scoring and Completion Logic
    if (nextStage === ProjectStage.COMPLETED && project.assignedDevManagerId) {
      const today = new Date();
      const overallDeadline = parseISO(project.overallDeadline);

      // Points for Delivery
      addScoreMutation.mutate({
        projectId: project.id,
        userId: project.assignedDevManagerId,
        points: SCORING_RULES.DELIVERY,
        reason: 'Project Delivery',
        date: today.toISOString()
      } as ScoreEntry);

      // Points for Schedule
      let schedulePoints = 0;
      let scheduleReason = '';

      if (differenceInDays(overallDeadline, today) >= 0) {
        schedulePoints = SCORING_RULES.ON_TIME;
        scheduleReason = 'On-Time Bonus';
      } else {
        schedulePoints = SCORING_RULES.DEADLINE_MISSED;
        scheduleReason = 'Deadline Missed Penalty';
      }

      addScoreMutation.mutate({
        projectId: project.id,
        userId: project.assignedDevManagerId,
        points: schedulePoints,
        reason: scheduleReason,
        date: today.toISOString()
      } as ScoreEntry);

      completedAt = today.toISOString();
    }

    updateProjectMutation.mutate({
      id,
      updates: {
        stage: nextStage,
        completedAt,
        newHistoryItem: historyEntry
      }
    });

    // Notifications for Admins to assign roles
    if (nextStage === ProjectStage.DESIGN || nextStage === ProjectStage.DEVELOPMENT || nextStage === ProjectStage.QA) {
      const adminUsers = users.filter(u => u.role === UserRole.ADMIN);
      const actionText = nextStage === ProjectStage.DESIGN ? 'Assign Designer' :
        nextStage === ProjectStage.DEVELOPMENT ? 'Assign Developer' : 'Assign QA Engineer';

      adminUsers.forEach(admin => {
        // Avoid duplicate notifications in short succession if possible, but for now simple add
        addNotification({
          title: `Project Ready for ${nextStage}`,
          message: `Project "${project.name}" has moved to ${nextStage}. Please ${actionText}.`,
          type: 'assignment',
          read: false, // Default
          userId: admin.id // Assuming notification system handles filtering by user or logic needs update
          // Note: Current local notification system is global for the browser session. 
          // In a real app, this would be backend driven.
          // We will simulate it by adding it to the context state.
        });
      });
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
    refetchInterval: 30000 // Poll every 30s
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
    refetchInterval: 60000
  });

  const getDevRankings = useCallback(() => {
    return rankings;
  }, [rankings]);

  return (
    <AppContext.Provider value={{
      currentUser, users, projects, scores, clients, isLoading, setCurrentUser,
      addProject, updateProject, addUser, updateUser, deleteUser, addComment, archiveProject, unarchiveProject, advanceStage, recordQAFeedback, regressToDev, getDevRankings,
      bulkUpdateStage, bulkAssignUser, bulkArchiveProjects, bulkDeleteProjects, deleteProject,
      notifications, addNotification, markNotificationAsRead, markAllNotificationsAsRead, clearAllNotifications
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
