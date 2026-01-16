import { z } from 'zod';

export const TaskStatus = z.enum(['todo', 'in_progress', 'review', 'done']);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  status: TaskStatus,
  error_message: z.string().nullable(),
  branch_name: z.string().nullable(),
  worktree_path: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: TaskStatus.optional(),
});

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const TasksResponseSchema = z.object({
  tasks: z.array(TaskSchema),
});

export type TasksResponse = z.infer<typeof TasksResponseSchema>;

export const TaskResponseSchema = TaskSchema;

export type TaskResponse = z.infer<typeof TaskResponseSchema>;

export const COLUMN_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

export const COLUMN_TITLES: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

export function canDropInColumn(fromStatus: TaskStatus, toStatus: TaskStatus): boolean {
  if (fromStatus === 'in_progress') {
    return false;
  }
  if (toStatus === 'in_progress') {
    return fromStatus === 'todo';
  }
  return true;
}
