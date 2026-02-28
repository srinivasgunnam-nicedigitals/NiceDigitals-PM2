import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backendApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// ============================================================
// useNotifications — Notification state and mutations.
//
// Polling removed: WebSocket INVALIDATE events drive refetches.
// Notifications update instantly when the server emits
// keys: ['notifications'], which happens on any relevant mutation.
// refetchOnWindowFocus ensures stale tabs catch up on re-focus.
// ============================================================

export function useNotifications() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: backendApi.getNotifications,
    enabled: !!currentUser,
    // No refetchInterval — WebSocket invalidation replaces polling.
    // This removes constant DB queries and replaces them with
    // targeted invalidation only when something actually changes.
    refetchOnWindowFocus: true,
    initialData: [],
  });


  const markReadMutation = useMutation({
    mutationFn: backendApi.markNotificationAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: backendApi.markAllNotificationsAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const clearMutation = useMutation({
    mutationFn: backendApi.clearNotifications,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return {
    ...query,
    notifications: query.data ?? [],
    markAsRead: markReadMutation.mutate,
    markAllAsRead: markAllReadMutation.mutate,
    clearAll: clearMutation.mutate,
  };
}
