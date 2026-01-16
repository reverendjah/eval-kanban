import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { Task } from '../types/task';
import { LogEntry } from '../hooks/useWebSocket';

interface LogPanelProps {
  task: Task | null;
  logs: LogEntry[];
  onClear: () => void;
  onClose: () => void;
}

export function LogPanel({ task, logs, onClear, onClose }: LogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!task) return null;

  return (
    <div className="border-t border-gray-700 bg-[#0f172a]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-white">Logs</h3>
          <span className="text-sm text-gray-400">- {task.title}</span>
          {task.status === 'in_progress' && (
            <span className="animate-pulse h-2 w-2 bg-blue-500 rounded-full" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="h-48 overflow-y-auto p-4 font-mono text-sm"
      >
        {logs.length === 0 ? (
          <p className="text-gray-500">No logs yet...</p>
        ) : (
          logs.map((entry, i) => (
            <div
              key={i}
              className={clsx(
                'whitespace-pre-wrap break-all',
                entry.stream === 'stderr' ? 'text-red-400' : 'text-gray-300'
              )}
            >
              <span className="text-gray-500 select-none">
                {new Date(entry.timestamp).toLocaleTimeString()} &gt;{' '}
              </span>
              {entry.content}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
