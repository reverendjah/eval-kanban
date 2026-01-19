import { useState } from 'react';
import clsx from 'clsx';
import { Task } from '../types/task';
import { useDiff } from '../hooks/useDiff';
import { usePreview } from '../hooks/usePreview';
import { useMergeTask } from '../hooks/useTasks';
import { DiffViewer } from './DiffViewer';
import { PreviewControls } from './PreviewControls';
import { EmptyState } from './ui';

interface ReviewPanelProps {
  task: Task;
  onClose: () => void;
  onMerge?: (id: string) => void;
}

type TabType = 'diff' | 'preview';

export function ReviewPanel({ task, onClose, onMerge }: ReviewPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('diff');
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const { data: diff, isLoading: diffLoading, error: diffError } = useDiff(task.id);
  const preview = usePreview(task.id);
  const mergeTask = useMergeTask();

  const handleApproveAndMerge = async () => {
    setMergeError(null);
    try {
      // Use onMerge callback if provided (for WebSocket events), otherwise use hook directly
      if (onMerge) {
        onMerge(task.id);
        onClose();
      } else {
        await mergeTask.mutateAsync(task.id);
        onClose();
      }
    } catch (error) {
      setMergeError(error instanceof Error ? error.message : 'Failed to merge task');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#1e293b] rounded-lg w-[90vw] h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <header className="flex flex-col border-b border-gray-700">
          <div className="flex items-center justify-between p-4">
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

            {/* Approve & Merge button */}
            <button
              onClick={() => setShowMergeConfirm(true)}
              disabled={mergeTask.isPending}
              data-testid="approve-merge-button"
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                mergeTask.isPending
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              )}
            >
              {mergeTask.isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Merging...
                </span>
              ) : (
                'Approve & Merge'
              )}
            </button>

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
          </div>

          {/* Error message */}
          {mergeError && (
            <div className="px-4 py-2 bg-red-900/50 text-red-300 text-sm">
              {mergeError}
            </div>
          )}
        </header>

        {/* Merge Confirmation Dialog */}
        {showMergeConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-[#1e293b] rounded-lg p-6 max-w-md border border-gray-600 shadow-xl">
              <h3 className="text-white font-semibold text-lg mb-2">
                Confirm Merge
              </h3>
              <p className="text-gray-300 mb-4">
                Merge branch <code className="bg-gray-800 px-1 rounded">{task.branch_name}</code> to main?
              </p>
              <p className="text-amber-400 text-sm mb-4">
                This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowMergeConfirm(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowMergeConfirm(false);
                    handleApproveAndMerge();
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Confirm Merge
                </button>
              </div>
            </div>
          </div>
        )}

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
              isRestartingBackend={preview.isRestartingBackend}
              isRestartingFrontend={preview.isRestartingFrontend}
              onStart={preview.start}
              onStop={preview.stop}
              onRestartBackend={preview.restartBackend}
              onRestartFrontend={preview.restartFrontend}
            />
          )}
        </main>
      </div>
    </div>
  );
}
