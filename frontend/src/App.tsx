import { useState, useCallback, useEffect } from 'react';
import { api } from './lib/api';
import { KanbanBoard } from './components/KanbanBoard';
import { CreateTaskModal } from './components/CreateTaskModal';
import { LogPanel } from './components/LogPanel';
import { ReviewPanel } from './components/ReviewPanel';
import { TaskDetailsModal } from './components/TaskDetailsModal';
import { Spinner } from './components/ui';
import {
  useTasks,
  useCreateTask,
  useDeleteTask,
  useStartTask,
  useCancelTask,
  useMoveTask,
  useUpdateTask,
  useMergeTask,
} from './hooks/useTasks';
import { useWebSocket, LogEntry, setMergeEventHandlers, clearMergeEventHandlers, setRebuildEventHandlers, clearRebuildEventHandlers } from './hooks/useWebSocket';
import { Task, TaskStatus } from './types/task';

function App() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsTask, setDetailsTask] = useState<Task | null>(null);
  const [reviewTask, setReviewTask] = useState<Task | null>(null);
  const [taskLogs, setTaskLogs] = useState<Record<string, LogEntry[]>>({});
  const [mergingTaskId, setMergingTaskId] = useState<string | undefined>();
  const [mergeStatus, setMergeStatus] = useState<string | undefined>();
  const [rebuildStatus, setRebuildStatus] = useState<'idle' | 'building' | 'ready' | 'failed'>('idle');
  const [rebuildMessage, setRebuildMessage] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('...');

  const { data: tasks = [], isLoading, error } = useTasks();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();
  const startTask = useStartTask();
  const cancelTask = useCancelTask();
  const moveTask = useMoveTask();
  const updateTask = useUpdateTask();
  const mergeTask = useMergeTask();

  const handleLog = useCallback((taskId: string, entry: LogEntry) => {
    setTaskLogs((prev) => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), entry],
    }));
  }, []);

  const handleExecutionComplete = useCallback((_taskId: string, _success: boolean) => {
    // Task completion is reflected via WebSocket task updates
  }, []);

  const { isConnected } = useWebSocket({
    onLog: handleLog,
    onExecutionComplete: handleExecutionComplete,
  });

  // Fetch project info on mount
  useEffect(() => {
    api.server.getInfo()
      .then((info) => setProjectName(info.name))
      .catch(() => setProjectName('eval-kanban'));
  }, []);

  // Set up merge event handlers
  useEffect(() => {
    setMergeEventHandlers({
      onMergeStarted: (taskId) => {
        setMergingTaskId(taskId);
        setMergeStatus('Starting merge...');
      },
      onMergeProgress: (taskId, status) => {
        if (taskId === mergingTaskId) {
          setMergeStatus(status);
        }
      },
      onMergeComplete: (completedTaskId, _commit, message) => {
        setMergingTaskId(undefined);
        setMergeStatus(undefined);
        // Close review panel if open for this task
        if (reviewTask?.id === completedTaskId) {
          setReviewTask(null);
        }
        // Show success toast (simple alert for now)
        console.log('Merge complete:', message);
      },
      onMergeFailed: (_failedTaskId, error) => {
        setMergingTaskId(undefined);
        setMergeStatus(undefined);
        console.error('Merge failed:', error);
        alert(`Merge failed: ${error}`);
      },
    });

    return () => clearMergeEventHandlers();
  }, [mergingTaskId, reviewTask]);

  // Set up rebuild event handlers
  useEffect(() => {
    setRebuildEventHandlers({
      onRebuildStarted: () => {
        setRebuildStatus('building');
        setRebuildMessage('Building server...');
      },
      onRebuildProgress: (message) => {
        setRebuildMessage(message);
      },
      onRebuildComplete: () => {
        setRebuildStatus('ready');
        setRebuildMessage('Build complete! Restart to apply changes.');
      },
      onRebuildFailed: (error) => {
        setRebuildStatus('failed');
        setRebuildMessage(`Build failed: ${error}`);
        console.error('Rebuild failed:', error);
      },
    });

    return () => clearRebuildEventHandlers();
  }, []);

  const handleCreateTask = async (input: { title: string; description?: string }) => {
    await createTask.mutateAsync(input);
    setIsCreateModalOpen(false);
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask.mutateAsync(id);
      if (selectedTask?.id === id) {
        setSelectedTask(null);
      }
      if (detailsTask?.id === id) {
        setDetailsTask(null);
      }
    }
  };

  const handleStartTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      setSelectedTask(task);
      setDetailsTask(null); // Close details modal when starting
    }
    await startTask.mutateAsync(id);
  };

  const handleCancelTask = async (id: string) => {
    await cancelTask.mutateAsync(id);
  };

  const handleMoveTask = async (taskId: string, newStatus: TaskStatus) => {
    await moveTask.mutateAsync(taskId, newStatus);
  };

  const handleSelectTask = (task: Task) => {
    // Open details modal instead of log panel
    setDetailsTask(task);
  };

  const handleCloseDetailsModal = () => {
    setDetailsTask(null);
  };

  const handleSaveTask = async (id: string, updates: { title?: string; description?: string }) => {
    await updateTask.mutateAsync({ id, input: updates });
    // Update detailsTask with new data
    const updatedTask = tasks.find((t) => t.id === id);
    if (updatedTask) {
      setDetailsTask({ ...updatedTask, ...updates });
    }
  };

  const handleViewLogs = (task: Task) => {
    setDetailsTask(null);
    setSelectedTask(task);
  };

  const handleClearLogs = () => {
    if (selectedTask) {
      setTaskLogs((prev) => ({
        ...prev,
        [selectedTask.id]: [],
      }));
    }
  };

  const handleCloseLogPanel = () => {
    setSelectedTask(null);
  };

  const handleReviewTask = (task: Task) => {
    setReviewTask(task);
  };

  const handleCloseReviewPanel = () => {
    setReviewTask(null);
  };

  const handleMergeTask = async (id: string) => {
    // Close review panel if open for this task
    if (reviewTask?.id === id) {
      setReviewTask(null);
    }
    await mergeTask.mutateAsync(id);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-2">Error loading tasks</h1>
          <p className="text-gray-400">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      <header className="border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">{projectName}</h1>
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
              title={isConnected ? 'Connected' : 'Disconnected'}
            />
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        </div>
      </header>

      {/* Rebuild Status Banner */}
      {rebuildStatus === 'building' && (
        <div className="bg-amber-600 text-white px-4 py-2 flex items-center justify-center gap-2">
          <Spinner size="sm" />
          <span>{rebuildMessage}</span>
        </div>
      )}
      {rebuildStatus === 'ready' && (
        <div className="bg-green-600 text-white px-4 py-2 flex items-center justify-center gap-4">
          <span>{rebuildMessage}</span>
          <button
            onClick={async () => {
              try {
                await api.server.restart();
                setRebuildStatus('idle');
                // Wait a bit for the new server to start, then reload
                setTimeout(() => {
                  window.location.reload();
                }, 3000);
              } catch (error) {
                console.error('Failed to restart server:', error);
                alert('Failed to restart server. Please restart manually.');
              }
            }}
            className="px-3 py-1 bg-white text-green-700 rounded font-medium hover:bg-green-100 transition-colors"
          >
            Restart Now
          </button>
          <button
            onClick={() => setRebuildStatus('idle')}
            className="text-green-200 hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
      {rebuildStatus === 'failed' && (
        <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-4">
          <span>{rebuildMessage}</span>
          <button
            onClick={() => setRebuildStatus('idle')}
            className="text-red-200 hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      <main className="flex-1 p-6 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner size="lg" />
          </div>
        ) : (
          <KanbanBoard
            tasks={tasks}
            onMoveTask={handleMoveTask}
            onSelectTask={handleSelectTask}
            onDeleteTask={handleDeleteTask}
            onStartTask={handleStartTask}
            onCancelTask={handleCancelTask}
            onReviewTask={handleReviewTask}
            onMergeTask={handleMergeTask}
            mergingTaskId={mergingTaskId}
            mergeStatus={mergeStatus}
          />
        )}
      </main>

      <LogPanel
        task={selectedTask}
        logs={selectedTask ? taskLogs[selectedTask.id] || [] : []}
        onClear={handleClearLogs}
        onClose={handleCloseLogPanel}
      />

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTask}
        isLoading={createTask.isPending}
      />

      {reviewTask && (
        <ReviewPanel
          task={reviewTask}
          onClose={handleCloseReviewPanel}
          onMerge={handleMergeTask}
        />
      )}

      {detailsTask && (
        <TaskDetailsModal
          task={detailsTask}
          onClose={handleCloseDetailsModal}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onStart={handleStartTask}
          onViewLogs={handleViewLogs}
        />
      )}
    </div>
  );
}

export default App;
