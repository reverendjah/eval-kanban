import { useState } from 'react';
import clsx from 'clsx';
import { Task } from '../types/task';
import { useDiff } from '../hooks/useDiff';
import { usePreview } from '../hooks/usePreview';
import { DiffViewer } from './DiffViewer';
import { PreviewControls } from './PreviewControls';
import { EmptyState } from './ui';

interface ReviewPanelProps {
  task: Task;
  onClose: () => void;
}

type TabType = 'diff' | 'preview';

export function ReviewPanel({ task, onClose }: ReviewPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('diff');
  const { data: diff, isLoading: diffLoading, error: diffError } = useDiff(task.id);
  const preview = usePreview(task.id);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#1e293b] rounded-lg w-[90vw] h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-white font-semibold text-lg">
              Review: {task.title}
            </h2>
            {task.branch_name && (
              <span className="text-gray-400 text-sm font-mono bg-gray-800 px-2 py-1 rounded">
                {task.branch_name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Tab buttons */}
            <div className="flex items-center bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('diff')}
                className={clsx(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                  activeTab === 'diff'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                Diff
                {diff && diff.files.length > 0 && (
                  <span className="ml-2 text-xs bg-gray-700 px-1.5 py-0.5 rounded">
                    {diff.files.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={clsx(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                  activeTab === 'preview'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                Preview
                {preview.status && (
                  <span className="ml-2 w-2 h-2 inline-block bg-green-400 rounded-full animate-pulse" />
                )}
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          {activeTab === 'diff' && (
            <>
              {diffError ? (
                <EmptyState
                  icon={
                    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  }
                  title="Failed to load diff"
                  description={diffError instanceof Error ? diffError.message : 'Unknown error'}
                  className="text-red-400"
                />
              ) : (
                <DiffViewer diff={diff} isLoading={diffLoading} />
              )}
            </>
          )}

          {activeTab === 'preview' && (
            <PreviewControls
              task={task}
              status={preview.status}
              error={preview.error}
              isStarting={preview.isStarting}
              isStopping={preview.isStopping}
              onStart={preview.start}
              onStop={preview.stop}
            />
          )}
        </main>
      </div>
    </div>
  );
}
