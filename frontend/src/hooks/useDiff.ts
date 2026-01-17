import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { DiffResponse } from '../types/review';

const DIFF_STALE_TIME_MS = 30_000;

export function useDiff(taskId: string | null) {
  return useQuery<DiffResponse>({
    queryKey: ['diff', taskId],
    queryFn: () => api.diff.get(taskId!),
    enabled: !!taskId,
    staleTime: DIFF_STALE_TIME_MS,
  });
}
