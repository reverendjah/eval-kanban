import { Droppable } from '@hello-pangea/dnd';
import clsx from 'clsx';
import { Task, TaskStatus, COLUMN_TITLES } from '../types/task';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onStartTask: (id: string) => void;
  onCancelTask: (id: string) => void;
  onReviewTask: (task: Task) => void;
  onMergeTask: (id: string) => void;
  mergingTaskId?: string;
  mergeStatus?: string;
}

export function KanbanColumn({
  status,
  tasks,
  onSelectTask,
  onDeleteTask,
  onStartTask,
  onCancelTask,
  onReviewTask,
  onMergeTask,
  mergingTaskId,
  mergeStatus,
}: KanbanColumnProps) {
  const title = COLUMN_TITLES[status];

  const statusColor = {
    todo: 'border-gray-500',
    in_progress: 'border-blue-500',
    review: 'border-yellow-500',
    done: 'border-green-500',
  }[status];

  return (
    <div className="flex flex-col w-72 min-w-[288px] h-full">
      <div className={clsx('flex items-center gap-2 mb-3 pb-2 border-b-2', statusColor)}>
        <h2 className="font-semibold text-white">{title}</h2>
        <span className="text-xs px-2 py-0.5 bg-gray-700 rounded-full text-gray-300">
          {tasks.length}
        </span>
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={clsx(
              'flex-1 overflow-y-auto min-h-[200px] p-2 rounded-lg transition-colors',
              snapshot.isDraggingOver ? 'bg-gray-700/50' : 'bg-gray-800/30'
            )}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onSelect={onSelectTask}
                onDelete={onDeleteTask}
                onStart={onStartTask}
                onCancel={onCancelTask}
                onReview={onReviewTask}
                onMerge={onMergeTask}
                isMerging={mergingTaskId === task.id}
                mergeStatus={mergingTaskId === task.id ? mergeStatus : undefined}
              />
            ))}
            {provided.placeholder}

            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <p className="text-center text-gray-500 text-sm py-4">
                No tasks
              </p>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
