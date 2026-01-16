import { describe, it, expect } from 'vitest';
import {
  TaskSchema,
  TaskStatus,
  CreateTaskSchema,
  canDropInColumn,
  COLUMN_ORDER,
  COLUMN_TITLES,
} from './task';

describe('TaskSchema', () => {
  it('should validate a valid task', () => {
    const validTask = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Task',
      description: 'A test description',
      status: 'todo',
      error_message: null,
      branch_name: null,
      worktree_path: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    const result = TaskSchema.safeParse(validTask);
    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const invalidTask = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Task',
      description: null,
      status: 'invalid_status',
      error_message: null,
      branch_name: null,
      worktree_path: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    const result = TaskSchema.safeParse(invalidTask);
    expect(result.success).toBe(false);
  });

  it('should require title', () => {
    const noTitle = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: '',
      description: null,
      status: 'todo',
      error_message: null,
      branch_name: null,
      worktree_path: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    const result = TaskSchema.safeParse(noTitle);
    expect(result.success).toBe(false);
  });
});

describe('TaskStatus', () => {
  it('should accept valid status values', () => {
    expect(TaskStatus.safeParse('todo').success).toBe(true);
    expect(TaskStatus.safeParse('in_progress').success).toBe(true);
    expect(TaskStatus.safeParse('review').success).toBe(true);
    expect(TaskStatus.safeParse('done').success).toBe(true);
  });

  it('should reject invalid status values', () => {
    expect(TaskStatus.safeParse('invalid').success).toBe(false);
    expect(TaskStatus.safeParse('').success).toBe(false);
  });
});

describe('CreateTaskSchema', () => {
  it('should validate with title only', () => {
    const result = CreateTaskSchema.safeParse({ title: 'New Task' });
    expect(result.success).toBe(true);
  });

  it('should validate with title and description', () => {
    const result = CreateTaskSchema.safeParse({
      title: 'New Task',
      description: 'Description here',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty title', () => {
    const result = CreateTaskSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });
});

describe('canDropInColumn', () => {
  it('should not allow dragging from in_progress', () => {
    expect(canDropInColumn('in_progress', 'todo')).toBe(false);
    expect(canDropInColumn('in_progress', 'review')).toBe(false);
    expect(canDropInColumn('in_progress', 'done')).toBe(false);
  });

  it('should allow dragging to in_progress only from todo', () => {
    expect(canDropInColumn('todo', 'in_progress')).toBe(true);
    expect(canDropInColumn('review', 'in_progress')).toBe(false);
    expect(canDropInColumn('done', 'in_progress')).toBe(false);
  });

  it('should allow free movement between todo, review, done', () => {
    expect(canDropInColumn('todo', 'review')).toBe(true);
    expect(canDropInColumn('todo', 'done')).toBe(true);
    expect(canDropInColumn('review', 'todo')).toBe(true);
    expect(canDropInColumn('review', 'done')).toBe(true);
    expect(canDropInColumn('done', 'todo')).toBe(true);
    expect(canDropInColumn('done', 'review')).toBe(true);
  });
});

describe('COLUMN_ORDER', () => {
  it('should have correct order', () => {
    expect(COLUMN_ORDER).toEqual(['todo', 'in_progress', 'review', 'done']);
  });
});

describe('COLUMN_TITLES', () => {
  it('should have titles for all statuses', () => {
    expect(COLUMN_TITLES.todo).toBe('To Do');
    expect(COLUMN_TITLES.in_progress).toBe('In Progress');
    expect(COLUMN_TITLES.review).toBe('Review');
    expect(COLUMN_TITLES.done).toBe('Done');
  });
});
