import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDiff } from './useDiff';
import { api } from '../lib/api';
import { ReactNode } from 'react';

vi.mock('../lib/api', () => ({
  api: {
    diff: {
      get: vi.fn(),
    },
  },
}));

const mockDiffGet = api.diff.get as Mock;

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

describe('useDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not fetch when taskId is null', () => {
    renderHook(() => useDiff(null), { wrapper: createWrapper() });
    expect(mockDiffGet).not.toHaveBeenCalled();
  });

  it('should fetch diff when taskId is provided', async () => {
    const mockDiff = {
      files: [
        {
          path: 'src/main.rs',
          change_type: 'modified' as const,
          additions: 10,
          deletions: 3,
          content: '@@ -1,3 +1,10 @@\n fn main() {}',
        },
      ],
      total_additions: 10,
      total_deletions: 3,
    };

    mockDiffGet.mockResolvedValueOnce(mockDiff);

    const { result } = renderHook(
      () => useDiff('550e8400-e29b-41d4-a716-446655440000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockDiffGet).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    expect(result.current.data).toEqual(mockDiff);
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch diff');
    mockDiffGet.mockRejectedValueOnce(error);

    const { result } = renderHook(
      () => useDiff('550e8400-e29b-41d4-a716-446655440000'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(error);
  });

  it('should be loading initially', () => {
    mockDiffGet.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(
      () => useDiff('550e8400-e29b-41d4-a716-446655440000'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
  });
});
