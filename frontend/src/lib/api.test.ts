import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, ApiError } from './api';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('api.tasks', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('list', () => {
    it('should fetch and parse tasks', async () => {
      const mockTasks = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Test Task',
          description: null,
          status: 'todo',
          error_message: null,
          branch_name: null,
          worktree_path: null,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tasks: mockTasks }),
      });

      const result = await api.tasks.list();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Task');
    });

    it('should throw ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      await expect(api.tasks.list()).rejects.toThrow(ApiError);
    });
  });

  describe('create', () => {
    it('should create a task', async () => {
      const newTask = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'New Task',
        description: 'Description',
        status: 'todo',
        error_message: null,
        branch_name: null,
        worktree_path: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newTask),
      });

      const result = await api.tasks.create({
        title: 'New Task',
        description: 'Description',
      });

      expect(result.title).toBe('New Task');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tasks',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const updatedTask = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Updated Task',
        description: null,
        status: 'done',
        error_message: null,
        branch_name: null,
        worktree_path: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T01:00:00.000Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedTask),
      });

      const result = await api.tasks.update(updatedTask.id, { status: 'done' });

      expect(result.status).toBe('done');
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/tasks/${updatedTask.id}`,
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  describe('delete', () => {
    it('should delete a task', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      await api.tasks.delete('550e8400-e29b-41d4-a716-446655440000');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tasks/550e8400-e29b-41d4-a716-446655440000',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should throw ApiError when task not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Task not found' }),
      });

      await expect(
        api.tasks.delete('nonexistent')
      ).rejects.toThrow(ApiError);
    });
  });

  describe('start', () => {
    it('should start a task', async () => {
      const startedTask = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Task',
        description: null,
        status: 'in_progress',
        error_message: null,
        branch_name: 'ek/task',
        worktree_path: '/data/worktrees/ek-task',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T01:00:00.000Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(startedTask),
      });

      const result = await api.tasks.start(startedTask.id);

      expect(result.status).toBe('in_progress');
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/tasks/${startedTask.id}/start`,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a task', async () => {
      const cancelledTask = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Task',
        description: null,
        status: 'todo',
        error_message: null,
        branch_name: null,
        worktree_path: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T01:00:00.000Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(cancelledTask),
      });

      const result = await api.tasks.cancel(cancelledTask.id);

      expect(result.status).toBe('todo');
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/tasks/${cancelledTask.id}/cancel`,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});

describe('ApiError', () => {
  it('should have correct properties', () => {
    const error = new ApiError(404, 'Not found');
    expect(error.status).toBe(404);
    expect(error.message).toBe('Not found');
    expect(error.name).toBe('ApiError');
  });
});
