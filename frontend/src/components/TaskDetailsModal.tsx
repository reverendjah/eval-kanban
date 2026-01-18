import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Task } from '../types/task';
import { Spinner } from './ui';

interface TaskDetailsModalProps {
  task: Task;
  onClose: () => void;
  onSave: (id: string, updates: { title?: string; description?: string }) => Promise<void>;
  onDelete: (id: string) => void;
  onStart: (id: string) => void;
  onViewLogs: (task: Task) => void;
}

export function TaskDetailsModal({
  task,
  onClose,
  onSave,
  onDelete,
  onStart,
  onViewLogs,
}: TaskDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setIsEditing(false);
  }, [task.id, task.title, task.description]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
      });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTitle(task.title);
    setDescription(task.description || '');
    setIsEditing(false);
    setError(null);
  };

  const handleDelete = () => {
    onDelete(task.id);
    onClose();
  };

  const handleStart = () => {
    onStart(task.id);
    onClose();
  };

  const isRunning = task.status === 'in_progress';
  const canEdit = task.status === 'todo';
  const canStart = task.status === 'todo';

  // Simple markdown rendering for description
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
      // Headers
      if (line.startsWith('## ')) {
        return (
          <h2 key={index} className="text-lg font-semibold text-white mt-4 mb-2">
            {line.slice(3)}
          </h2>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <h1 key={index} className="text-xl font-bold text-white mt-4 mb-2">
            {line.slice(2)}
          </h1>
        );
      }
      // Numbered lists
      if (/^\d+\.\s/.test(line)) {
        return (
          <div key={index} className="flex gap-2 ml-4 my-1">
            <span className="text-blue-400">{line.match(/^\d+/)?.[0]}.</span>
            <span className="text-gray-300">{line.replace(/^\d+\.\s/, '')}</span>
          </div>
        );
      }
      // Bullet points
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={index} className="flex gap-2 ml-4 my-1">
            <span className="text-blue-400">•</span>
            <span className="text-gray-300">{line.slice(2)}</span>
          </div>
        );
      }
      // Bold text
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={index} className="text-gray-300 my-1">
            {parts.map((part, i) =>
              i % 2 === 1 ? (
                <strong key={i} className="text-white font-medium">
                  {part}
                </strong>
              ) : (
                part
              )
            )}
          </p>
        );
      }
      // Empty lines
      if (line.trim() === '') {
        return <div key={index} className="h-2" />;
      }
      // Regular text
      return (
        <p key={index} className="text-gray-300 my-1">
          {line}
        </p>
      );
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#1e293b] rounded-lg w-[80vw] max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span
              className={clsx(
                'px-2 py-1 text-xs font-medium rounded',
                task.status === 'todo' && 'bg-gray-600 text-gray-200',
                task.status === 'in_progress' && 'bg-blue-600 text-white',
                task.status === 'review' && 'bg-yellow-600 text-white',
                task.status === 'done' && 'bg-green-600 text-white'
              )}
            >
              {task.status.replace('_', ' ').toUpperCase()}
            </span>
            {task.branch_name && (
              <span className="text-gray-400 text-sm font-mono bg-gray-800 px-2 py-1 rounded">
                {task.branch_name}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">Title</label>
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Task title..."
                autoFocus
              />
            ) : (
              <h2 className="text-xl font-semibold text-white">{task.title}</h2>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Description / Plan
            </label>
            {isEditing ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
                placeholder="Task description or plan..."
              />
            ) : (
              <div className="bg-gray-800/50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                {task.description ? (
                  <div className="prose prose-invert max-w-none">
                    {renderMarkdown(task.description)}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No description</p>
                )}
              </div>
            )}
          </div>

          {/* Error message */}
          {task.error_message && (
            <div className="mb-6 p-3 bg-red-900/30 border border-red-600/50 rounded-lg">
              <label className="block text-sm font-medium text-red-400 mb-1">Error</label>
              <p className="text-red-300 text-sm">{task.error_message}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Created:</span>
              <span className="text-gray-300 ml-2">{formatDate(task.created_at)}</span>
            </div>
            <div>
              <span className="text-gray-500">Updated:</span>
              <span className="text-gray-300 ml-2">{formatDate(task.updated_at)}</span>
            </div>
          </div>
        </main>

        {/* Error banner */}
        {error && (
          <div className="px-6 py-2 bg-red-900/50 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Footer */}
        <footer className="flex items-center justify-between p-4 border-t border-gray-700">
          <div className="flex items-center gap-2">
            {isRunning && (
              <button
                onClick={() => onViewLogs(task)}
                className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Logs
              </button>
            )}
            <button
              onClick={handleDelete}
              className="px-3 py-2 text-sm bg-red-600/20 hover:bg-red-600/40 rounded-lg text-red-400 transition-colors"
            >
              Delete
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-lg text-white transition-colors flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Spinner size="sm" color="white" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </>
            ) : (
              <>
                {canEdit && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 hover:text-white transition-colors"
                  >
                    Edit
                  </button>
                )}
                {canStart && (
                  <button
                    onClick={handleStart}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start Task
                  </button>
                )}
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
