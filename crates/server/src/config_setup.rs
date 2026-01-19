//! Claude configuration setup for eval-kanban.
//!
//! Ensures both GLOBAL (~/.claude/) and LOCAL (project/.claude/) configurations
//! are properly set up following kakaroto-config architecture.

use crate::bundled_config;
use serde_json::{json, Value};
use std::fs;
use std::io;
use std::path::Path;

const VERSION: &str = env!("CARGO_PKG_VERSION");
const VERSION_FILE: &str = ".eval-kanban-version";

/// Setup result with information about what was done.
#[derive(Debug)]
pub struct SetupResult {
    pub global_created: bool,
    pub global_updated: bool,
    pub local_created: bool,
    pub local_updated: bool,
}

/// Ensure Claude configuration is set up for both GLOBAL and LOCAL levels.
pub fn ensure_config(working_dir: &Path) -> io::Result<SetupResult> {
    let global_result = ensure_global_config()?;
    let local_result = ensure_local_config(working_dir)?;

    Ok(SetupResult {
        global_created: global_result.0,
        global_updated: global_result.1,
        local_created: local_result.0,
        local_updated: local_result.1,
    })
}

/// Ensure GLOBAL configuration at ~/.claude/
///
/// This includes:
/// - CLAUDE.md (global rules)
/// - ARCHITECTURE.md (system documentation)
/// - commands/ (skills: feature, debug, gate)
/// - agents/ (7 specialized subagents)
/// - settings.json (default MCP permissions)
fn ensure_global_config() -> io::Result<(bool, bool)> {
    let global_dir = dirs::home_dir()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Home directory not found"))?
        .join(".claude");

    let version_file = global_dir.join(VERSION_FILE);
    let mut created = false;
    let mut updated = false;

    // If global dir doesn't exist, create everything
    if !global_dir.exists() {
        tracing::info!("Creating global Claude config at ~/.claude/");
        fs::create_dir_all(&global_dir)?;
        bundled_config::extract_to(&global_dir)?;
        fs::write(&version_file, VERSION)?;
        created = true;
        tracing::info!("Global Claude config created (kakaroto-config v{})", VERSION);
    } else {
        // Check if we need to update
        let current_version = fs::read_to_string(&version_file).unwrap_or_default();

        if current_version.trim() != VERSION {
            tracing::info!(
                "Updating global Claude config: {} -> {}",
                current_version.trim(),
                VERSION
            );
            // Update commands/ and agents/, preserve user's CLAUDE.md
            update_global_config(&global_dir)?;
            fs::write(&version_file, VERSION)?;
            updated = true;
            tracing::info!("Global Claude config updated to v{}", VERSION);
        } else {
            tracing::debug!("Global Claude config is up to date (v{})", VERSION);
        }
    }

    Ok((created, updated))
}

/// Update global config without overwriting user's CLAUDE.md
fn update_global_config(global_dir: &Path) -> io::Result<()> {
    // Always update these (kakaroto internal files)
    let update_prefixes = ["commands/", "agents/", "templates/", "ARCHITECTURE.md", "settings.json"];
    bundled_config::extract_selective(global_dir, &update_prefixes)?;

    // Only create CLAUDE.md if it doesn't exist (preserve user customizations)
    let claude_md = global_dir.join("CLAUDE.md");
    if !claude_md.exists() {
        if let Some(content) = bundled_config::get_file("CLAUDE.md") {
            fs::write(&claude_md, content)?;
        }
    }

    Ok(())
}

/// Ensure LOCAL configuration at project/.claude/
///
/// This includes:
/// - CLAUDE.md (project-specific, generated if not exists)
/// - specs/ directory
/// - plans/ directory
/// - settings.json (merged with MCP permissions)
fn ensure_local_config(project_dir: &Path) -> io::Result<(bool, bool)> {
    let local_dir = project_dir.join(".claude");
    let mut created = false;
    let mut updated = false;

    // Create directory structure
    if !local_dir.exists() {
        fs::create_dir_all(&local_dir)?;
        created = true;
    }

    // Create specs/ and plans/ directories
    fs::create_dir_all(local_dir.join("specs"))?;
    fs::create_dir_all(local_dir.join("plans"))?;

    // Create CLAUDE.md if not exists
    let claude_md = local_dir.join("CLAUDE.md");
    if !claude_md.exists() {
        let content = generate_project_claude_md(project_dir);
        fs::write(&claude_md, content)?;
        tracing::info!("Created local .claude/CLAUDE.md");
        created = true;
    }

    // Merge settings.json (add MCPs without overwriting)
    let settings_path = local_dir.join("settings.json");
    if merge_settings_json(&settings_path)? {
        updated = true;
    }

    if created {
        tracing::info!("Local Claude config created at {}/.claude/", project_dir.display());
    }

    Ok((created, updated))
}

/// Generate a project-specific CLAUDE.md template.
fn generate_project_claude_md(project_dir: &Path) -> String {
    let project_name = project_dir
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("project");

    // Detect project type
    let has_package_json = project_dir.join("package.json").exists();
    let has_cargo_toml = project_dir.join("Cargo.toml").exists();

    let commands = if has_package_json {
        r#"## Comandos
- `npm run dev` - Desenvolvimento
- `npm test` - Testes
- `npm run build` - Build"#
    } else if has_cargo_toml {
        r#"## Comandos
- `cargo run` - Desenvolvimento
- `cargo test` - Testes
- `cargo build --release` - Build"#
    } else {
        r#"## Comandos
(adicione os comandos do projeto aqui)"#
    };

    let slug = project_name.to_lowercase().replace(' ', "-");

    format!(
        r#"# {project_name}

{commands}

## Estrutura
(adicione a estrutura do projeto aqui)

## Memory Namespace
Prefixo: `{slug}:`
"#
    )
}

/// Merge MCP permissions into existing settings.json or create new one.
fn merge_settings_json(settings_path: &Path) -> io::Result<bool> {
    // Get bundled permissions
    let bundled_settings: Value = bundled_config::get_file("settings.json")
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_else(|| json!({"permissions": {"allow": []}}));

    let bundled_allow = bundled_settings
        .get("permissions")
        .and_then(|p| p.get("allow"))
        .and_then(|a| a.as_array())
        .cloned()
        .unwrap_or_default();

    // Read existing settings or create empty
    let mut settings: Value = if settings_path.exists() {
        let content = fs::read_to_string(settings_path)?;
        serde_json::from_str(&content).unwrap_or_else(|_| json!({}))
    } else {
        json!({})
    };

    // Get or create permissions.allow array
    let permissions = settings
        .as_object_mut()
        .unwrap()
        .entry("permissions")
        .or_insert_with(|| json!({}));

    let allow = permissions
        .as_object_mut()
        .unwrap()
        .entry("allow")
        .or_insert_with(|| json!([]))
        .as_array_mut()
        .unwrap();

    // Add missing permissions
    let mut added = false;
    for perm in bundled_allow {
        if !allow.contains(&perm) {
            allow.push(perm);
            added = true;
        }
    }

    // Write if changed
    if added || !settings_path.exists() {
        let content = serde_json::to_string_pretty(&settings)?;
        fs::write(settings_path, content)?;

        if added {
            tracing::info!("Updated settings.json with MCP permissions");
        }
        return Ok(true);
    }

    Ok(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env::temp_dir;

    #[test]
    fn test_generate_project_claude_md() {
        let content = generate_project_claude_md(Path::new("/home/user/my-project"));
        assert!(content.contains("# my-project"));
        assert!(content.contains("my-project:"));
    }

    #[test]
    fn test_merge_settings_creates_file() {
        let temp = temp_dir().join("test-claude-settings");
        fs::create_dir_all(&temp).unwrap();
        let settings_path = temp.join("settings.json");

        // Remove if exists
        let _ = fs::remove_file(&settings_path);

        let result = merge_settings_json(&settings_path);
        assert!(result.is_ok());
        assert!(settings_path.exists());

        // Cleanup
        let _ = fs::remove_dir_all(&temp);
    }
}
