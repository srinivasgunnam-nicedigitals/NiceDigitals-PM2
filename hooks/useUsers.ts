import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backendApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';

// ============================================================
// useUsers — User management (read + mutations in one file since
// the user domain is small and cohesion outweighs splitting).
// ============================================================

export function useUsers() {
  const { currentUser, isAuthenticating } = useAuth();

  const query = useQuery({
    queryKey: ['users'],
    queryFn: backendApi.getUsers,
    enabled: !!currentUser && !isAuthenticating,
    refetchOnWindowFocus: true,
    initialData: [] as User[],
  });

  return {
    ...query,
    users: query.data ?? [],
  };
}

export function useAddUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: backendApi.addUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Partial<User> }) =>
      backendApi.updateUser(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: backendApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
