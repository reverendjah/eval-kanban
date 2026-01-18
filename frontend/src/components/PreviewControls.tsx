import { Task } from '../types/task';
import { PreviewInfo } from '../types/review';
import { Spinner, EmptyState } from './ui';
import { useServerHealth } from '../hooks/useServerHealth';
import { ServerStatusBadge } from './ServerStatusBadge';

interface PreviewControlsProps {
  task: Task;
  status: PreviewInfo | null;
  error: string | null;
  isStarting: boolean;
  isStopping: boolean;
  isRestartingBackend: boolean;
  isRestartingFrontend: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestartBackend: () => void;
  onRestartFrontend: () => void;
}

export function PreviewControls({
  task,
  status,
  error,
  isStarting,
  isStopping,
  isRestartingBackend,
  isRestartingFrontend,
  onStart,
  onStop,
  onRestartBackend,
  onRestartFrontend,
}: PreviewControlsProps) {
  const health = useServerHealth(
    status?.frontend_url ?? null,
    status?.backend_url ?? null
  );

  const WarningIcon = (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );

  if (!task.worktree_path) {
    return (
      <EmptyState
        icon={WarningIcon}
        title="No worktree available for preview"
        description="Task must be executed first"
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls Header */}
      <div className="p-4 border-b border-gray-700 flex items-center gap-4">
        {!status ? (
          <button
            onClick={onStart}
            disabled={isStarting}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed rounded text-white font-medium transition-colors flex items-center gap-2"
          >
            {isStarting ? (
              <>
                <Spinner size="sm" color="white" />
                Starting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Preview
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={onStop}
              disabled={isStopping}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed rounded text-white font-medium transition-colors flex items-center gap-2"
            >
              {isStopping ? (
                <>
                  <Spinner size="sm" color="white" />
                  Stopping...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  Stop Preview
                </>
              )}
            </button>

            <div className="flex items-center gap-3 ml-auto">
              <ServerStatusBadge
                status={health.frontend}
                label="Frontend"
                url={status.frontend_url}
                port={status.frontend_port}
                onRestart={onRestartFrontend}
                isRestarting={isRestartingFrontend}
              />
              <ServerStatusBadge
                status={health.backend}
                label="Backend"
                url={status.backend_url}
                port={status.backend_port}
                onRestart={onRestartBackend}
                isRestarting={isRestartingBackend}
              />
            </div>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-900/20 border-b border-red-700">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Preview iframe or placeholder */}
      <div className="flex-1 p-4">
        {status ? (
          <iframe
            src={status.frontend_url}
            className="w-full h-full border border-gray-700 rounded-lg bg-white"
            title="Preview"
          />
        ) : (
          <div className="flex items-center justify-center h-full border border-gray-700 border-dashed rounded-lg text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p>Start preview to see your changes</p>
              <p className="text-sm mt-1">This will run the backend and frontend servers</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
