import { useState } from 'react';
import clsx from 'clsx';
import { DiffFile, DiffResponse, DiffChangeType } from '../types/review';
import { Spinner, EmptyState } from './ui';

interface DiffViewerProps {
  diff: DiffResponse | undefined;
  isLoading: boolean;
}

function getChangeTypeColor(type: DiffChangeType): string {
  switch (type) {
    case 'added':
      return 'text-green-400';
    case 'deleted':
      return 'text-red-400';
    case 'modified':
      return 'text-yellow-400';
    case 'renamed':
      return 'text-blue-400';
    default:
      return 'text-gray-400';
  }
}

function getChangeTypeLabel(type: DiffChangeType): string {
  switch (type) {
    case 'added':
      return 'A';
    case 'deleted':
      return 'D';
    case 'modified':
      return 'M';
    case 'renamed':
      return 'R';
    default:
      return '?';
  }
}

interface DiffFileCardProps {
  file: DiffFile;
}

function DiffFileCard({ file }: DiffFileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden mb-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-[#0f172a] hover:bg-[#1e293b] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={clsx('font-mono text-xs font-bold', getChangeTypeColor(file.change_type))}>
            {getChangeTypeLabel(file.change_type)}
          </span>
          <span className="text-sm text-gray-200 font-mono truncate">
            {file.path}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-green-400">+{file.additions}</span>
          <span className="text-xs text-red-400">-{file.deletions}</span>
          <svg
            className={clsx('w-4 h-4 text-gray-400 transition-transform', isExpanded && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="bg-[#0d1117] overflow-x-auto">
          <pre className="text-xs p-3 font-mono">
            {file.content.split('\n').map((line, i) => (
              <div
                key={i}
                className={clsx(
                  'px-2 -mx-2',
                  line.startsWith('+') && !line.startsWith('+++') && 'bg-green-900/30 text-green-300',
                  line.startsWith('-') && !line.startsWith('---') && 'bg-red-900/30 text-red-300',
                  line.startsWith('@@') && 'text-blue-400 bg-blue-900/20',
                  !line.startsWith('+') && !line.startsWith('-') && !line.startsWith('@@') && 'text-gray-400'
                )}
              >
                {line}
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
}

const DocumentIcon = (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export function DiffViewer({ diff, isLoading }: DiffViewerProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!diff || diff.files.length === 0) {
    return (
      <EmptyState
        icon={DocumentIcon}
        title="No changes to display"
        className="h-64"
      />
    );
  }

  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="mb-4 flex items-center gap-4 text-sm">
        <span className="text-gray-400">
          {diff.files.length} file{diff.files.length !== 1 ? 's' : ''} changed
        </span>
        <span className="text-green-400">+{diff.total_additions}</span>
        <span className="text-red-400">-{diff.total_deletions}</span>
      </div>

      {diff.files.map((file) => (
        <DiffFileCard key={file.path} file={file} />
      ))}
    </div>
  );
}
