import { Draggable } from '@hello-pangea/dnd';
import clsx from 'clsx';
import { Task } from '../types/task';

interface TaskCardProps {
  task: Task;
  index: number;
  onSelect: (task: Task) => void;
  onDelete: (id: string) => void;
  onStart: (id: string) => void;
  onCancel: (id: string) => void;
}

export function TaskCard({ task, index, onSelect, onDelete, onStart, onCancel }: TaskCardProps) {
  const isRunning = task.status === 'in_progress';
  const hasError = !!task.error_message;

  return (
    <Draggable
      draggableId={task.id}
      index={index}
      isDragDisabled={isRunning}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={clsx(
            'p-3 mb-2 rounded-lg shadow-md transition-all cursor-pointer',
            'bg-[#1e293b] hover:bg-[#334155]',
            snapshot.isDragging && 'shadow-lg rotate-2 scale-105',
            isRunning && 'border-l-4 border-blue-500',
            hasError && 'border-l-4 border-red-500',
            !isRunning && !hasError && 'border-l-4 border-transparent'
          )}
          onClick={() => onSelect(task)}
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm text-white truncate flex-1">
              {task.title}
            </h3>
            {isRunning && (
              <span className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full flex-shrink-0" />
            )}
          </div>

          {task.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          {hasError && (
            <p className="text-xs text-red-400 mt-1 line-clamp-1">
              {task.error_message}
            </p>
          )}

          {task.branch_name && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z" />
              </svg>
              <span className="truncate font-mono">{task.branch_name}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-1 mt-2">
            {task.status === 'todo' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStart(task.id);
                }}
                className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white"
              >
                Start
              </button>
            )}

            {isRunning && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(task.id);
                }}
                className="px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 rounded text-white"
              >
                Cancel
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 rounded text-red-400"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
}
