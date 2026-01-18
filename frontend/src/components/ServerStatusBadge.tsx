import { ServerStatus } from '../hooks/useServerHealth';

interface ServerStatusBadgeProps {
  status: ServerStatus;
  label: string;
  url: string;
  port: number;
  onRestart?: () => void;
  isRestarting?: boolean;
}

const statusConfig: Record<ServerStatus, { bg: string; dot: string; animate: boolean }> = {
  checking: {
    bg: 'bg-yellow-900/30',
    dot: 'bg-yellow-400',
    animate: true,
  },
  ready: {
    bg: 'bg-green-900/30',
    dot: 'bg-green-400',
    animate: false,
  },
  error: {
    bg: 'bg-red-900/30',
    dot: 'bg-red-400',
    animate: false,
  },
};

const statusText: Record<ServerStatus, string> = {
  checking: 'text-yellow-400',
  ready: 'text-green-400',
  error: 'text-red-400',
};

export function ServerStatusBadge({
  status,
  label,
  url,
  port,
  onRestart,
  isRestarting = false,
}: ServerStatusBadgeProps) {
  const config = statusConfig[status];
  const textColor = statusText[status];

  const handleRestart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRestart && !isRestarting) {
      onRestart();
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md ${config.bg}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot} ${config.animate || isRestarting ? 'animate-pulse' : ''}`} />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <span className={`text-sm font-medium ${textColor}`}>
          {label}
        </span>
        <span className="text-gray-500 text-xs">
          :{port}
        </span>
        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
      {onRestart && (
        <button
          onClick={handleRestart}
          disabled={isRestarting}
          className="ml-1 p-1 rounded hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={`Restart ${label.toLowerCase()} server`}
        >
          <svg
            className={`w-3.5 h-3.5 text-gray-400 hover:text-white ${isRestarting ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
