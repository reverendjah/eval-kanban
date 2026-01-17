import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePreview } from './usePreview';
import { api } from '../lib/api';
import { ReactNode } from 'react';

vi.mock('../lib/api', () => ({
  api: {
    preview: {
      start: vi.fn(),
      stop: vi.fn(),
      status: vi.fn(),
    },
  },
}));

const mockPreviewStart = api.preview.start as Mock;
const mockPreviewStop = api.preview.stop as Mock;
const mockPreviewStatus = api.preview.status as Mock;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('usePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial state when taskId is null', () => {
    const { result } = renderHook(() => usePreview(null), { wrapper: createWrapper() });

    expect(result.current.status).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isStarting).toBe(false);
    expect(result.current.isStopping).toBe(false);
  });

  it('should check initial status on mount', async () => {
    vi.useRealTimers();
    const mockInfo = {
      task_id: '550e8400-e29b-41d4-a716-446655440000',
      backend_url: 'http://localhost:9900',
      frontend_url: 'http://localhost:5200',
      backend_port: 9900,
      frontend_port: 5200,
      status: 'running' as const,
    };

    mockPreviewStatus.mockResolvedValueOnce(mockInfo);

    const { result } = renderHook(
      () => usePreview('550e8400-e29b-41d4-a716-446655440000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.status).toEqual(mockInfo));
  });

  it('should handle status check failure on mount', async () => {
    vi.useRealTimers();
    mockPreviewStatus.mockRejectedValueOnce(new Error('Not found'));

    const { result } = renderHook(
      () => usePreview('550e8400-e29b-41d4-a716-446655440000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(mockPreviewStatus).toHaveBeenCalled());
    expect(result.current.status).toBeNull();
  });

  it('should start preview', async () => {
    vi.useRealTimers();
    const mockInfo = {
      task_id: '550e8400-e29b-41d4-a716-446655440000',
      backend_url: 'http://localhost:9900',
      frontend_url: 'http://localhost:5200',
      backend_port: 9900,
      frontend_port: 5200,
      status: 'running' as const,
    };

    mockPreviewStatus.mockRejectedValueOnce(new Error('Not found'));
    mockPreviewStart.mockResolvedValueOnce(mockInfo);

    const { result } = renderHook(
      () => usePreview('550e8400-e29b-41d4-a716-446655440000'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.status).toEqual(mockInfo));
    expect(result.current.error).toBeNull();
  });

  it('should handle start error', async () => {
    vi.useRealTimers();
    mockPreviewStatus.mockRejectedValueOnce(new Error('Not found'));
    mockPreviewStart.mockRejectedValueOnce(new Error('Failed to start'));

    const { result } = renderHook(
      () => usePreview('550e8400-e29b-41d4-a716-446655440000'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.start();
    });

    await waitFor(() => expect(result.current.error).toBe('Failed to start'));
  });

  it('should not start when taskId is null', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePreview(null), { wrapper: createWrapper() });

    await act(async () => {
      result.current.start();
    });

    expect(mockPreviewStart).not.toHaveBeenCalled();
  });

  it('should not stop when taskId is null', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => usePreview(null), { wrapper: createWrapper() });

    await act(async () => {
      result.current.stop();
    });

    expect(mockPreviewStop).not.toHaveBeenCalled();
  });
});
