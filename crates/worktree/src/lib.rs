use std::path::{Path, PathBuf};
use git2::{Repository, BranchType};
use thiserror::Error;

pub mod diff;
pub use diff::{DiffFile, DiffChangeType, DiffResponse, get_worktree_diff};

#[derive(Debug, Error)]
pub enum WorktreeError {
    #[error("Git error: {0}")]
    Git(#[from] git2::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Not a git repository")]
    NotARepo,
    #[error("Branch already exists: {0}")]
    BranchExists(String),
    #[error("Worktree already exists: {0}")]
    WorktreeExists(String),
    #[error("Branch not found: {0}")]
    BranchNotFound(String),
    #[error("Merge conflict: {0}")]
    MergeConflict(String),
}

/// Create a slug from a title for branch naming
pub fn slugify(title: &str) -> String {
    title
        .to_lowercase()
        .chars()
        .map(|c| {
            if c.is_alphanumeric() {
                c
            } else if c.is_whitespace() || c == '-' || c == '_' {
                '-'
            } else {
                '\0'
            }
        })
        .filter(|&c| c != '\0')
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
        .chars()
        .take(50)
        .collect()
}

/// Generate a unique branch name from task title and task ID
pub fn generate_branch_name(title: &str, task_id: &str) -> String {
    let short_id = &task_id[..8.min(task_id.len())];
    format!("ek/{}-{}", slugify(title), short_id)
}

/// Manager for git worktrees
pub struct WorktreeManager {
    repo_path: PathBuf,
    worktrees_base_dir: PathBuf,
}

impl WorktreeManager {
    pub fn new(repo_path: PathBuf, worktrees_base_dir: PathBuf) -> Self {
        Self {
            repo_path,
            worktrees_base_dir,
        }
    }

    /// Check if the path is a valid git repository
    pub fn is_git_repo(&self) -> bool {
        Repository::open(&self.repo_path).is_ok()
    }

    /// Get the hash of the repo path for unique worktree directory
    fn get_project_hash(&self) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        self.repo_path.to_string_lossy().hash(&mut hasher);
        format!("{:x}", hasher.finish())[..8].to_string()
    }

    /// Get the worktree directory for a task
    pub fn get_worktree_path(&self, task_slug: &str) -> PathBuf {
        self.worktrees_base_dir
            .join(self.get_project_hash())
            .join(task_slug)
    }

    /// Create a worktree for a task
    pub async fn create_worktree(
        &self,
        task_title: &str,
        task_id: &str,
    ) -> Result<(String, PathBuf), WorktreeError> {
        let branch_name = generate_branch_name(task_title, task_id);
        let short_id = &task_id[..8.min(task_id.len())];
        let slug = format!("{}-{}", slugify(task_title), short_id);
        let worktree_path = self.get_worktree_path(&slug);

        let repo_path = self.repo_path.clone();
        let branch_name_clone = branch_name.clone();
        let worktree_path_clone = worktree_path.clone();

        tokio::task::spawn_blocking(move || {
            create_worktree_sync(&repo_path, &branch_name_clone, &worktree_path_clone)
        })
        .await
        .map_err(|e| WorktreeError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string(),
        )))??;

        Ok((branch_name, worktree_path))
    }

    /// Remove a worktree
    pub async fn remove_worktree(&self, worktree_path: &Path) -> Result<(), WorktreeError> {
        let repo_path = self.repo_path.clone();
        let worktree_path = worktree_path.to_path_buf();

        tokio::task::spawn_blocking(move || {
            remove_worktree_sync(&repo_path, &worktree_path)
        })
        .await
        .map_err(|e| WorktreeError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string(),
        )))?
    }

    /// List all worktrees for this repo
    pub fn list_worktrees(&self) -> Result<Vec<PathBuf>, WorktreeError> {
        let project_dir = self.worktrees_base_dir.join(self.get_project_hash());

        if !project_dir.exists() {
            return Ok(vec![]);
        }

        let entries = std::fs::read_dir(&project_dir)?;
        let worktrees: Vec<PathBuf> = entries
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| p.is_dir() && p.join(".git").exists())
            .collect();

        Ok(worktrees)
    }

    /// Cleanup orphaned worktrees (worktrees without corresponding tasks)
    pub async fn cleanup_orphans(&self, valid_paths: &[String]) -> Result<Vec<PathBuf>, WorktreeError> {
        let worktrees = self.list_worktrees()?;
        let mut removed = Vec::new();

        for worktree in worktrees {
            let path_str = worktree.to_string_lossy().to_string();
            if !valid_paths.contains(&path_str) {
                tracing::info!("Removing orphan worktree: {}", path_str);
                if let Err(e) = self.remove_worktree(&worktree).await {
                    tracing::warn!("Failed to remove orphan worktree {}: {}", path_str, e);
                } else {
                    removed.push(worktree);
                }
            }
        }

        Ok(removed)
    }

    /// Merge a branch into main and return to main branch
    pub async fn merge_branch(&self, branch_name: &str) -> Result<(), WorktreeError> {
        let repo_path = self.repo_path.clone();
        let branch_name = branch_name.to_string();

        tokio::task::spawn_blocking(move || {
            merge_branch_sync(&repo_path, &branch_name)
        })
        .await
        .map_err(|e| WorktreeError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string(),
        )))?
    }

    /// Delete a branch after merge
    pub async fn delete_branch(&self, branch_name: &str) -> Result<(), WorktreeError> {
        let repo_path = self.repo_path.clone();
        let branch_name = branch_name.to_string();

        tokio::task::spawn_blocking(move || {
            delete_branch_sync(&repo_path, &branch_name)
        })
        .await
        .map_err(|e| WorktreeError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string(),
        )))?
    }

    /// Get the HEAD commit hash of the main repo
    pub async fn get_head_commit(&self) -> Result<String, WorktreeError> {
        let repo_path = self.repo_path.clone();

        tokio::task::spawn_blocking(move || {
            let repo = Repository::open(&repo_path)?;
            let head = repo.head()?;
            let commit = head.peel_to_commit()?;
            Ok(commit.id().to_string())
        })
        .await
        .map_err(|e| WorktreeError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string(),
        )))?
    }
}

fn create_worktree_sync(
    repo_path: &Path,
    branch_name: &str,
    worktree_path: &Path,
) -> Result<(), WorktreeError> {
    let repo = Repository::open(repo_path)?;

    // Ensure parent directory exists
    if let Some(parent) = worktree_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    // Check if worktree already exists
    if worktree_path.exists() {
        return Err(WorktreeError::WorktreeExists(
            worktree_path.to_string_lossy().to_string(),
        ));
    }

    // Get HEAD commit
    let head = repo.head()?;
    let head_commit = head.peel_to_commit()?;

    // Check if branch already exists
    if repo.find_branch(branch_name, BranchType::Local).is_ok() {
        return Err(WorktreeError::BranchExists(branch_name.to_string()));
    }

    // Create the branch
    repo.branch(branch_name, &head_commit, false)?;

    // Create the worktree using git CLI (more reliable than libgit2)
    let output = std::process::Command::new("git")
        .args([
            "worktree",
            "add",
            worktree_path.to_str().unwrap(),
            branch_name,
        ])
        .current_dir(repo_path)
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(WorktreeError::Git(git2::Error::from_str(&format!(
            "Failed to create worktree: {}",
            stderr
        ))));
    }

    tracing::info!(
        "Created worktree at {} with branch {}",
        worktree_path.display(),
        branch_name
    );

    Ok(())
}

fn remove_worktree_sync(repo_path: &Path, worktree_path: &Path) -> Result<(), WorktreeError> {
    // Use git CLI for reliable worktree removal
    let output = std::process::Command::new("git")
        .args([
            "worktree",
            "remove",
            "--force",
            worktree_path.to_str().unwrap(),
        ])
        .current_dir(repo_path)
        .output()?;

    if !output.status.success() {
        // Try manual cleanup if git worktree remove fails
        if worktree_path.exists() {
            std::fs::remove_dir_all(worktree_path)?;
        }
    }

    // Prune stale worktree references
    let _ = std::process::Command::new("git")
        .args(["worktree", "prune"])
        .current_dir(repo_path)
        .output();

    tracing::info!("Removed worktree at {}", worktree_path.display());

    Ok(())
}

fn merge_branch_sync(repo_path: &Path, branch_name: &str) -> Result<(), WorktreeError> {
    // First, checkout main
    let output = std::process::Command::new("git")
        .args(["checkout", "main"])
        .current_dir(repo_path)
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(WorktreeError::Git(git2::Error::from_str(&format!(
            "Failed to checkout main: {}",
            stderr
        ))));
    }

    // Merge the branch
    let output = std::process::Command::new("git")
        .args(["merge", branch_name, "--no-edit"])
        .current_dir(repo_path)
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Check if it's a merge conflict
        if stderr.contains("CONFLICT") || stderr.contains("conflict") {
            // Abort the merge
            let _ = std::process::Command::new("git")
                .args(["merge", "--abort"])
                .current_dir(repo_path)
                .output();
            return Err(WorktreeError::MergeConflict(stderr.to_string()));
        }
        return Err(WorktreeError::Git(git2::Error::from_str(&format!(
            "Failed to merge branch: {}",
            stderr
        ))));
    }

    tracing::info!("Merged branch {} into main", branch_name);

    Ok(())
}

fn delete_branch_sync(repo_path: &Path, branch_name: &str) -> Result<(), WorktreeError> {
    // Delete the branch (use -D to force delete even if not fully merged)
    let output = std::process::Command::new("git")
        .args(["branch", "-d", branch_name])
        .current_dir(repo_path)
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // If branch not found, it's ok
        if !stderr.contains("not found") {
            tracing::warn!("Failed to delete branch {}: {}", branch_name, stderr);
        }
    } else {
        tracing::info!("Deleted branch {}", branch_name);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_slugify() {
        assert_eq!(slugify("Hello World"), "hello-world");
        assert_eq!(slugify("Add login button"), "add-login-button");
        assert_eq!(slugify("Fix  bug!!!"), "fix-bug");
        assert_eq!(slugify("CamelCase"), "camelcase");
        assert_eq!(slugify("  spaces  "), "spaces");
    }

    #[test]
    fn test_generate_branch_name() {
        assert_eq!(generate_branch_name("Add login"), "ek/add-login");
        assert_eq!(generate_branch_name("Fix bug #123"), "ek/fix-bug-123");
    }

    #[test]
    fn test_slugify_max_length() {
        let long_title = "a".repeat(100);
        let slug = slugify(&long_title);
        assert!(slug.len() <= 50);
    }
}
