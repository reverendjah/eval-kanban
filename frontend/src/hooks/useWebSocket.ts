import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Task, TaskSchema } from '../types/task';
import { z } from 'zod';

const WsMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('task_updated'),
    task: TaskSchema,
  }),
  z.object({
    type: z.literal('task_deleted'),
    task_id: z.string(),
  }),
  z.object({
    type: z.literal('log'),
    task_id: z.string(),
    content: z.string(),
    stream: z.string(),
  }),
  z.object({
    type: z.literal('execution_complete'),
    task_id: z.string(),
    success: z.boolean(),
  }),
  z.object({
    type: z.literal('ping'),
  }),
  z.object({
    type: z.literal('pong'),
  }),
]);

type WsMessage = z.infer<typeof WsMessageSchema>;

export interface LogEntry {
  content: string;
  stream: 'stdout' | 'stderr';
  timestamp: number;
}

interface UseWebSocketOptions {
  onLog?: (taskId: string, entry: LogEntry) => void;
  onExecutionComplete?: (taskId: string, success: boolean) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected, reconnecting...');
      reconnectTimeoutRef.current = window.setTimeout(connect, 2000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const message = WsMessageSchema.parse(data);

        handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    wsRef.current = ws;
  }, []);

  const handleMessage = useCallback(
    (message: WsMessage) => {
      switch (message.type) {
        case 'task_updated':
          queryClient.setQueryData<Task[]>(['tasks'], (old) => {
            if (!old) return [message.task];
            const exists = old.some((t) => t.id === message.task.id);
            if (exists) {
              return old.map((t) => (t.id === message.task.id ? message.task : t));
            }
            return [message.task, ...old];
          });
          queryClient.setQueryData(['tasks', message.task.id], message.task);
          break;

        case 'task_deleted':
          queryClient.setQueryData<Task[]>(['tasks'], (old) => {
            return old?.filter((t) => t.id !== message.task_id);
          });
          queryClient.removeQueries({ queryKey: ['tasks', message.task_id] });
          break;

        case 'log':
          options.onLog?.(message.task_id, {
            content: message.content,
            stream: message.stream as 'stdout' | 'stderr',
            timestamp: Date.now(),
          });
          break;

        case 'execution_complete':
          options.onExecutionComplete?.(message.task_id, message.success);
          break;

        case 'ping':
          wsRef.current?.send(JSON.stringify({ type: 'pong' }));
          break;

        case 'pong':
          break;
      }
    },
    [queryClient, options.onLog, options.onExecutionComplete]
  );

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((taskId: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'subscribe', task_id: taskId }));
  }, []);

  const unsubscribe = useCallback((taskId: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'unsubscribe', task_id: taskId }));
  }, []);

  return {
    isConnected,
    subscribe,
    unsubscribe,
  };
}
