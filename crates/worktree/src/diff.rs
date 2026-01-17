use std::path::Path;
use std::process::Command;
use serde::Serialize;

use crate::WorktreeError;

#[derive(Debug, Clone, Serialize)]
pub struct DiffFile {
    pub path: String,
    pub change_type: DiffChangeType,
    pub additions: usize,
    pub deletions: usize,
    pub content: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DiffChangeType {
    Added,
    Modified,
    Deleted,
    Renamed,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiffResponse {
    pub files: Vec<DiffFile>,
    pub total_additions: usize,
    pub total_deletions: usize,
}

/// Get the diff for a worktree compared to its parent commit
pub fn get_worktree_diff(worktree_path: &Path) -> Result<DiffResponse, WorktreeError> {
    // First, get the list of changed files with stats
    let stat_output = Command::new("git")
        .args(["diff", "HEAD~1", "--stat", "--stat-width=1000"])
        .current_dir(worktree_path)
        .output()?;

    if !stat_output.status.success() {
        // Try comparing against main/master if HEAD~1 doesn't work
        let stat_output = Command::new("git")
            .args(["diff", "main", "--stat", "--stat-width=1000"])
            .current_dir(worktree_path)
            .output()?;

        if !stat_output.status.success() {
            return Ok(DiffResponse {
                files: vec![],
                total_additions: 0,
                total_deletions: 0,
            });
        }
    }

    // Get the actual diff content
    let diff_output = Command::new("git")
        .args(["diff", "HEAD~1"])
        .current_dir(worktree_path)
        .output()?;

    let diff_content = if diff_output.status.success() {
        String::from_utf8_lossy(&diff_output.stdout).to_string()
    } else {
        // Try against main
        let diff_output = Command::new("git")
            .args(["diff", "main"])
            .current_dir(worktree_path)
            .output()?;
        String::from_utf8_lossy(&diff_output.stdout).to_string()
    };

    // Parse the diff output
    let files = parse_diff(&diff_content);

    let total_additions: usize = files.iter().map(|f| f.additions).sum();
    let total_deletions: usize = files.iter().map(|f| f.deletions).sum();

    Ok(DiffResponse {
        files,
        total_additions,
        total_deletions,
    })
}

/// Parse unified diff format into structured DiffFile objects
fn parse_diff(diff_content: &str) -> Vec<DiffFile> {
    let mut files = Vec::new();
    let mut current_file: Option<DiffFile> = None;
    let mut current_content = String::new();

    for line in diff_content.lines() {
        if line.starts_with("diff --git") {
            // Save previous file if exists
            if let Some(mut file) = current_file.take() {
                file.content = current_content.clone();
                files.push(file);
            }
            current_content.clear();

            // Extract file path from "diff --git a/path b/path"
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 4 {
                let path = parts[3].trim_start_matches("b/").to_string();
                current_file = Some(DiffFile {
                    path,
                    change_type: DiffChangeType::Modified,
                    additions: 0,
                    deletions: 0,
                    content: String::new(),
                });
            }
        } else if line.starts_with("new file mode") {
            if let Some(ref mut file) = current_file {
                file.change_type = DiffChangeType::Added;
            }
        } else if line.starts_with("deleted file mode") {
            if let Some(ref mut file) = current_file {
                file.change_type = DiffChangeType::Deleted;
            }
        } else if line.starts_with("rename from") || line.starts_with("rename to") {
            if let Some(ref mut file) = current_file {
                file.change_type = DiffChangeType::Renamed;
            }
        } else if let Some(ref mut file) = current_file {
            // Count additions and deletions
            if line.starts_with('+') && !line.starts_with("+++") {
                file.additions += 1;
            } else if line.starts_with('-') && !line.starts_with("---") {
                file.deletions += 1;
            }
            current_content.push_str(line);
            current_content.push('\n');
        }
    }

    // Don't forget the last file
    if let Some(mut file) = current_file {
        file.content = current_content;
        files.push(file);
    }

    files
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_diff_modified() {
        let diff = r#"diff --git a/src/main.rs b/src/main.rs
index 1234567..abcdefg 100644
--- a/src/main.rs
+++ b/src/main.rs
@@ -1,3 +1,4 @@
 fn main() {
+    println!("Hello");
     println!("World");
 }
"#;
        let files = parse_diff(diff);
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "src/main.rs");
        assert_eq!(files[0].additions, 1);
        assert_eq!(files[0].deletions, 0);
    }

    #[test]
    fn test_parse_diff_new_file() {
        let diff = r#"diff --git a/new_file.txt b/new_file.txt
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/new_file.txt
@@ -0,0 +1 @@
+Hello World
"#;
        let files = parse_diff(diff);
        assert_eq!(files.len(), 1);
        assert!(matches!(files[0].change_type, DiffChangeType::Added));
    }
}
