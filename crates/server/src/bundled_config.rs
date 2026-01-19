//! Bundled Claude configuration files from kakaroto-config.
//!
//! These files are embedded at compile time and extracted to ~/.claude/ on first run.

use rust_embed::Embed;
use std::fs;
use std::io;
use std::path::Path;

/// Embedded Claude configuration files (kakaroto-config).
#[derive(Embed)]
#[folder = "bundled-claude/"]
pub struct BundledClaudeConfig;

/// Extract all bundled files to the specified directory.
pub fn extract_to(dest: &Path) -> io::Result<()> {
    for file_path in BundledClaudeConfig::iter() {
        let file_path_str = file_path.as_ref();

        // Get the embedded file content
        if let Some(content) = BundledClaudeConfig::get(file_path_str) {
            let dest_path = dest.join(file_path_str);

            // Create parent directories
            if let Some(parent) = dest_path.parent() {
                fs::create_dir_all(parent)?;
            }

            // Write file
            fs::write(&dest_path, content.data.as_ref())?;
            tracing::debug!("Extracted: {}", file_path_str);
        }
    }

    Ok(())
}

/// Extract only specific files/directories to destination.
pub fn extract_selective(dest: &Path, prefixes: &[&str]) -> io::Result<()> {
    for file_path in BundledClaudeConfig::iter() {
        let file_path_str = file_path.as_ref();

        // Check if file matches any prefix
        let should_extract = prefixes.iter().any(|prefix| file_path_str.starts_with(prefix));

        if should_extract {
            if let Some(content) = BundledClaudeConfig::get(file_path_str) {
                let dest_path = dest.join(file_path_str);

                if let Some(parent) = dest_path.parent() {
                    fs::create_dir_all(parent)?;
                }

                fs::write(&dest_path, content.data.as_ref())?;
                tracing::debug!("Extracted: {}", file_path_str);
            }
        }
    }

    Ok(())
}

/// Get a specific bundled file content as string.
pub fn get_file(path: &str) -> Option<String> {
    BundledClaudeConfig::get(path)
        .map(|f| String::from_utf8_lossy(f.data.as_ref()).to_string())
}

/// List all bundled files.
pub fn list_files() -> Vec<String> {
    BundledClaudeConfig::iter()
        .map(|f| f.to_string())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bundled_files_exist() {
        let files = list_files();
        assert!(!files.is_empty(), "Should have bundled files");

        // Check essential files exist
        assert!(files.iter().any(|f| f == "CLAUDE.md"), "Should have CLAUDE.md");
        assert!(files.iter().any(|f| f == "ARCHITECTURE.md"), "Should have ARCHITECTURE.md");
        assert!(files.iter().any(|f| f == "settings.json"), "Should have settings.json");
        assert!(files.iter().any(|f| f.starts_with("commands/")), "Should have commands/");
        assert!(files.iter().any(|f| f.starts_with("agents/")), "Should have agents/");
    }

    #[test]
    fn test_get_claude_md() {
        let content = get_file("CLAUDE.md");
        assert!(content.is_some(), "Should be able to read CLAUDE.md");
        assert!(content.unwrap().contains("Autonomia"), "CLAUDE.md should contain Autonomia");
    }
}
