import { z } from 'zod';

export const DiffChangeType = z.enum(['added', 'modified', 'deleted', 'renamed']);
export type DiffChangeType = z.infer<typeof DiffChangeType>;

export const DiffFileSchema = z.object({
  path: z.string(),
  change_type: DiffChangeType,
  additions: z.number(),
  deletions: z.number(),
  content: z.string(),
});

export type DiffFile = z.infer<typeof DiffFileSchema>;

export const DiffResponseSchema = z.object({
  files: z.array(DiffFileSchema),
  total_additions: z.number(),
  total_deletions: z.number(),
});

export type DiffResponse = z.infer<typeof DiffResponseSchema>;

export const PreviewStatus = z.enum(['starting', 'running', 'stopped', 'error']);
export type PreviewStatus = z.infer<typeof PreviewStatus>;

export const PreviewInfoSchema = z.object({
  task_id: z.string(),
  backend_url: z.string(),
  frontend_url: z.string(),
  backend_port: z.number(),
  frontend_port: z.number(),
  status: PreviewStatus,
});

export type PreviewInfo = z.infer<typeof PreviewInfoSchema>;
