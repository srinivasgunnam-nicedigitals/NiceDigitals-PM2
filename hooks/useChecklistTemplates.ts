import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { ChecklistTemplate, ProjectStage } from '../types';

export function useChecklistTemplates(stage?: ProjectStage) {
  return useQuery({
    queryKey: ['checklist-templates', stage],
    queryFn: async () => {
      const url = stage ? `/checklist-templates?stage=${stage}` : '/checklist-templates';
      const { data } = await api.get<ChecklistTemplate[]>(url);
      return data;
    }
  });
}

export function useCreateChecklistTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: Partial<ChecklistTemplate>) => {
      const { data } = await api.post<ChecklistTemplate>('/checklist-templates', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
    }
  });
}

export function useUpdateChecklistTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Partial<ChecklistTemplate>) => {
      const { data } = await api.patch<ChecklistTemplate>(`/checklist-templates/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
    }
  });
}

export function useDeleteChecklistTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/checklist-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
    }
  });
}
