import { useState, useCallback } from 'react';
import { KanbanBoard } from './components/KanbanBoard';
import { CreateTaskModal } from './components/CreateTaskModal';
import { LogPanel } from './components/LogPanel';
import {
  useTasks,
  useCreateTask,
  useDeleteTask,
  useStartTask,
  useCancelTask,
  useMoveTask,
} from './hooks/useTasks';
import { useWebSocket, LogEntry } from './hooks/useWebSocket';
import { Task, TaskStatus } from './types/task';

function App() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskLogs, setTaskLogs] = useState<Record<string, LogEntry[]>>({});

  const { data: tasks = [], isLoading, error } = useTasks();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();
  const startTask = useStartTask();
  const cancelTask = useCancelTask();
  const moveTask = useMoveTask();

  const handleLog = useCallback((taskId: string, entry: LogEntry) => {
    setTaskLogs((prev) => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), entry],
    }));
  }, []);

  const handleExecutionComplete = useCallback((taskId: string, success: boolean) => {
    console.log(`Task ${taskId} completed with success: ${success}`);
  }, []);

  const { isConnected } = useWebSocket({
    onLog: handleLog,
    onExecutionComplete: handleExecutionComplete,
  });

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
    }
  };

  const handleStartTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      setSelectedTask(task);
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
            <h1 className="text-2xl font-bold text-white">eval-kanban</h1>
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

      <main className="flex-1 p-6 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <KanbanBoard
            tasks={tasks}
            onMoveTask={handleMoveTask}
            onSelectTask={handleSelectTask}
            onDeleteTask={handleDeleteTask}
            onStartTask={handleStartTask}
            onCancelTask={handleCancelTask}
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
    </div>
  );
}

export default App;
