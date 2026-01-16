-- Add worktree fields to tasks table
ALTER TABLE tasks ADD COLUMN branch_name TEXT;
ALTER TABLE tasks ADD COLUMN worktree_path TEXT;
