import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Task, CreateTaskInput, UpdateTaskInput, TaskStatus } from '../types/task';

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: api.tasks.list,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => api.tasks.get(id),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.tasks.create(input),
    onSuccess: (task) => {
      queryClient.setQueryData<Task[]>(['tasks'], (old) => {
        return old ? [task, ...old] : [task];
      });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      api.tasks.update(id, input),
    onSuccess: (task) => {
      queryClient.setQueryData<Task[]>(['tasks'], (old) => {
        return old?.map((t) => (t.id === task.id ? task : t));
      });
      queryClient.setQueryData(['tasks', task.id], task);
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.tasks.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Task[]>(['tasks'], (old) => {
        return old?.filter((t) => t.id !== id);
      });
      queryClient.removeQueries({ queryKey: ['tasks', id] });
    },
  });
}

export function useStartTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.tasks.start(id),
    onSuccess: (task) => {
      queryClient.setQueryData<Task[]>(['tasks'], (old) => {
        return old?.map((t) => (t.id === task.id ? task : t));
      });
      queryClient.setQueryData(['tasks', task.id], task);
    },
  });
}

export function useCancelTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.tasks.cancel(id),
    onSuccess: (task) => {
      queryClient.setQueryData<Task[]>(['tasks'], (old) => {
        return old?.map((t) => (t.id === task.id ? task : t));
      });
      queryClient.setQueryData(['tasks', task.id], task);
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.tasks.complete(id),
    onSuccess: (task) => {
      queryClient.setQueryData<Task[]>(['tasks'], (old) => {
        return old?.map((t) => (t.id === task.id ? task : t));
      });
      queryClient.setQueryData(['tasks', task.id], task);
    },
  });
}

export function useMergeTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.tasks.merge(id),
    onSuccess: () => {
      // Query will be updated via WebSocket TaskUpdated event
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useMoveTask() {
  const updateTask = useUpdateTask();
  const startTask = useStartTask();

  return {
    mutateAsync: async (id: string, newStatus: TaskStatus) => {
      if (newStatus === 'in_progress') {
        return startTask.mutateAsync(id);
      }
      return updateTask.mutateAsync({ id, input: { status: newStatus } });
    },
    isPending: updateTask.isPending || startTask.isPending,
  };
}
