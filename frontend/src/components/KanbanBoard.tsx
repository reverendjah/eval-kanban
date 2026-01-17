import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Task, TaskStatus, COLUMN_ORDER, canDropInColumn } from '../types/task';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  tasks: Task[];
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
  onSelectTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onStartTask: (id: string) => void;
  onCancelTask: (id: string) => void;
  onReviewTask: (task: Task) => void;
}

export function KanbanBoard({
  tasks,
  onMoveTask,
  onSelectTask,
  onDeleteTask,
  onStartTask,
  onCancelTask,
  onReviewTask,
}: KanbanBoardProps) {
  const tasksByStatus = COLUMN_ORDER.reduce(
    (acc, status) => {
      acc[status] = tasks.filter((t) => t.status === status);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>
  );

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceStatus = source.droppableId as TaskStatus;
    const destStatus = destination.droppableId as TaskStatus;

    if (!canDropInColumn(sourceStatus, destStatus)) {
      return;
    }

    onMoveTask(draggableId, destStatus);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {COLUMN_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            onSelectTask={onSelectTask}
            onDeleteTask={onDeleteTask}
            onStartTask={onStartTask}
            onCancelTask={onCancelTask}
            onReviewTask={onReviewTask}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
