import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { PreviewInfo } from '../types/review';

const PREVIEW_POLL_INTERVAL_MS = 5_000;

export function usePreview(taskId: string | null) {
  const [status, setStatus] = useState<PreviewInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startMutation = useMutation({
    mutationFn: () => api.preview.start(taskId!),
    onSuccess: (data) => {
      setStatus(data);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => api.preview.stop(taskId!),
    onSuccess: () => {
      setStatus(null);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Poll status while running
  useEffect(() => {
    if (!taskId || !status) return;

    const interval = setInterval(async () => {
      try {
        const newStatus = await api.preview.status(taskId);
        setStatus(newStatus);
      } catch {
        // Preview might have stopped
        setStatus(null);
      }
    }, PREVIEW_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [taskId, status]);

  // Check if preview is already running on mount
  useEffect(() => {
    if (!taskId) return;

    api.preview.status(taskId)
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [taskId]);

  const start = useCallback(() => {
    if (taskId) {
      startMutation.mutate();
    }
  }, [taskId, startMutation]);

  const stop = useCallback(() => {
    if (taskId) {
      stopMutation.mutate();
    }
  }, [taskId, stopMutation]);

  return {
    status,
    error,
    start,
    stop,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
  };
}
