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
import {
  StartPlanRequest,
  StartPlanResponse,
  AnswerRequest,
  ExecutePlanRequest,
  ExecutePlanResponse,
  PlanSessionInfo,
  PlanSessionInfoSchema,
} from '../types/plan';
import { z } from 'zod';

const StartPlanResponseSchema = z.object({
  session_id: z.string(),
});

const MergeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  merge_commit: z.string().nullable().optional(),
}).passthrough(); // passthrough allows the flattened task fields

export interface MergeResponse {
  success: boolean;
  message: string;
  merge_commit?: string | null;
}

const ExecutePlanResponseSchema = z.object({
  task_id: z.string(),
  message: z.string(),
});

const ServerInfoSchema = z.object({
  name: z.string(),
  path: z.string(),
});

export interface ServerInfo {
  name: string;
  path: string;
}

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

    complete: async (id: string): Promise<Task> => {
      const response = await fetch(`${API_BASE}/tasks/${id}/complete`, {
        method: 'POST',
      });
      return handleResponse(response, TaskSchema);
    },

    merge: async (id: string): Promise<MergeResponse> => {
      const response = await fetch(`${API_BASE}/tasks/${id}/merge`, {
        method: 'POST',
      });
      return handleResponse(response, MergeResponseSchema);
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

    restart: async (taskId: string, server: 'backend' | 'frontend'): Promise<PreviewInfo> => {
      const response = await fetch(`${API_BASE}/tasks/${taskId}/preview/restart/${server}`, {
        method: 'POST',
      });
      return handleResponse(response, PreviewInfoSchema);
    },
  },

  plan: {
    start: async (request: StartPlanRequest): Promise<StartPlanResponse> => {
      const response = await fetch(`${API_BASE}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      return handleResponse(response, StartPlanResponseSchema);
    },

    get: async (sessionId: string): Promise<PlanSessionInfo> => {
      const response = await fetch(`${API_BASE}/plan/${sessionId}`);
      return handleResponse(response, PlanSessionInfoSchema);
    },

    answer: async (sessionId: string, request: AnswerRequest): Promise<void> => {
      const response = await fetch(`${API_BASE}/plan/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      await handleVoidResponse(response);
    },

    execute: async (sessionId: string, request: ExecutePlanRequest): Promise<ExecutePlanResponse> => {
      const response = await fetch(`${API_BASE}/plan/${sessionId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      return handleResponse(response, ExecutePlanResponseSchema);
    },

    cancel: async (sessionId: string): Promise<void> => {
      const response = await fetch(`${API_BASE}/plan/${sessionId}`, {
        method: 'DELETE',
      });
      await handleVoidResponse(response);
    },

    redo: async (sessionId: string): Promise<StartPlanResponse> => {
      const response = await fetch(`${API_BASE}/plan/${sessionId}/redo`, {
        method: 'POST',
      });
      return handleResponse(response, StartPlanResponseSchema);
    },

    resume: async (sessionId: string): Promise<StartPlanResponse> => {
      const response = await fetch(`${API_BASE}/plan/${sessionId}/resume`, {
        method: 'POST',
      });
      return handleResponse(response, StartPlanResponseSchema);
    },
  },

  server: {
    getInfo: async (): Promise<ServerInfo> => {
      const response = await fetch(`${API_BASE}/server/info`);
      return handleResponse(response, ServerInfoSchema);
    },

    restart: async (): Promise<void> => {
      const response = await fetch(`${API_BASE}/server/restart`, {
        method: 'POST',
      });
      await handleVoidResponse(response);
    },
  },
};

export { ApiError };
