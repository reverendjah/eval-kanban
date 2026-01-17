import {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TasksResponseSchema,
  TaskSchema,
} from '../types/task';
import {
  DiffResponse,
  DiffResponseSchema,
  PreviewInfo,
  PreviewInfoSchema,
} from '../types/review';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response, schema: { parse: (data: unknown) => T }): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, error.error || 'Request failed');
  }
  const data = await response.json();
  return schema.parse(data);
}

async function handleVoidResponse(response: Response): Promise<void> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, error.error || 'Request failed');
  }
}

export const api = {
  tasks: {
    list: async (): Promise<Task[]> => {
      const response = await fetch(`${API_BASE}/tasks`);
      const data = await handleResponse(response, TasksResponseSchema);
      return data.tasks;
    },

    get: async (id: string): Promise<Task> => {
      const response = await fetch(`${API_BASE}/tasks/${id}`);
      return handleResponse(response, TaskSchema);
    },

    create: async (input: CreateTaskInput): Promise<Task> => {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return handleResponse(response, TaskSchema);
    },

    update: async (id: string, input: UpdateTaskInput): Promise<Task> => {
      const response = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return handleResponse(response, TaskSchema);
    },

    delete: async (id: string): Promise<void> => {
      const response = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'DELETE',
      });
      await handleVoidResponse(response);
    },

    start: async (id: string): Promise<Task> => {
      const response = await fetch(`${API_BASE}/tasks/${id}/start`, {
        method: 'POST',
      });
      return handleResponse(response, TaskSchema);
    },

    cancel: async (id: string): Promise<Task> => {
      const response = await fetch(`${API_BASE}/tasks/${id}/cancel`, {
        method: 'POST',
      });
      return handleResponse(response, TaskSchema);
    },
  },

  diff: {
    get: async (taskId: string): Promise<DiffResponse> => {
      const response = await fetch(`${API_BASE}/tasks/${taskId}/diff`);
      return handleResponse(response, DiffResponseSchema);
    },
  },

  preview: {
    start: async (taskId: string): Promise<PreviewInfo> => {
      const response = await fetch(`${API_BASE}/tasks/${taskId}/preview`, {
        method: 'POST',
      });
      return handleResponse(response, PreviewInfoSchema);
    },

    stop: async (taskId: string): Promise<void> => {
      const response = await fetch(`${API_BASE}/tasks/${taskId}/preview`, {
        method: 'DELETE',
      });
      await handleVoidResponse(response);
    },

    status: async (taskId: string): Promise<PreviewInfo> => {
      const response = await fetch(`${API_BASE}/tasks/${taskId}/preview`);
      return handleResponse(response, PreviewInfoSchema);
    },
  },
};

export { ApiError };
