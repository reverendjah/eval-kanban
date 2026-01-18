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

describe('api.diff', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('get', () => {
    it('should fetch and parse diff', async () => {
      const mockDiff = {
        files: [
          {
            path: 'src/main.rs',
            change_type: 'modified',
            additions: 10,
            deletions: 3,
            content: '@@ -1,3 +1,10 @@\n fn main() {}',
          },
        ],
        total_additions: 10,
        total_deletions: 3,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDiff),
      });

      const result = await api.diff.get('550e8400-e29b-41d4-a716-446655440000');
      expect(result.files).toHaveLength(1);
      expect(result.total_additions).toBe(10);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tasks/550e8400-e29b-41d4-a716-446655440000/diff'
      );
    });

    it('should throw ApiError on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Task not found' }),
      });

      await expect(
        api.diff.get('nonexistent')
      ).rejects.toThrow(ApiError);
    });
  });
});

describe('api.preview', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('start', () => {
    it('should start preview and return info', async () => {
      const mockInfo = {
        task_id: '550e8400-e29b-41d4-a716-446655440000',
        backend_url: 'http://localhost:9900',
        frontend_url: 'http://localhost:5200',
        backend_port: 9900,
        frontend_port: 5200,
        status: 'running',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInfo),
      });

      const result = await api.preview.start('550e8400-e29b-41d4-a716-446655440000');
      expect(result.backend_port).toBe(9900);
      expect(result.frontend_port).toBe(5200);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tasks/550e8400-e29b-41d4-a716-446655440000/preview',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should throw ApiError when task has no worktree', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Task has no worktree' }),
      });

      await expect(
        api.preview.start('550e8400-e29b-41d4-a716-446655440000')
      ).rejects.toThrow(ApiError);
    });
  });

  describe('stop', () => {
    it('should stop preview', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      await api.preview.stop('550e8400-e29b-41d4-a716-446655440000');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tasks/550e8400-e29b-41d4-a716-446655440000/preview',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should throw ApiError when no preview running', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'No preview running for this task' }),
      });

      await expect(
        api.preview.stop('550e8400-e29b-41d4-a716-446655440000')
      ).rejects.toThrow(ApiError);
    });
  });

  describe('status', () => {
    it('should get preview status', async () => {
      const mockInfo = {
        task_id: '550e8400-e29b-41d4-a716-446655440000',
        backend_url: 'http://localhost:9900',
        frontend_url: 'http://localhost:5200',
        backend_port: 9900,
        frontend_port: 5200,
        status: 'running',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInfo),
      });

      const result = await api.preview.status('550e8400-e29b-41d4-a716-446655440000');
      expect(result.status).toBe('running');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tasks/550e8400-e29b-41d4-a716-446655440000/preview'
      );
    });

    it('should throw ApiError when no preview running', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'No preview running for this task' }),
      });

      await expect(
        api.preview.status('nonexistent')
      ).rejects.toThrow(ApiError);
    });
  });

  describe('restart', () => {
    it('should restart backend server', async () => {
      const mockInfo = {
        task_id: '550e8400-e29b-41d4-a716-446655440000',
        backend_url: 'http://localhost:9901',
        frontend_url: 'http://localhost:5200',
        backend_port: 9901,
        frontend_port: 5200,
        status: 'starting',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInfo),
      });

      const result = await api.preview.restart('550e8400-e29b-41d4-a716-446655440000', 'backend');
      expect(result.backend_port).toBe(9901);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tasks/550e8400-e29b-41d4-a716-446655440000/preview/restart/backend',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should restart frontend server', async () => {
      const mockInfo = {
        task_id: '550e8400-e29b-41d4-a716-446655440000',
        backend_url: 'http://localhost:9900',
        frontend_url: 'http://localhost:5201',
        backend_port: 9900,
        frontend_port: 5201,
        status: 'starting',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInfo),
      });

      const result = await api.preview.restart('550e8400-e29b-41d4-a716-446655440000', 'frontend');
      expect(result.frontend_port).toBe(5201);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tasks/550e8400-e29b-41d4-a716-446655440000/preview/restart/frontend',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should throw ApiError when no preview running', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'No preview running for this task' }),
      });

      await expect(
        api.preview.restart('nonexistent', 'backend')
      ).rejects.toThrow(ApiError);
    });
  });
});
