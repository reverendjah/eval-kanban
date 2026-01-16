use std::path::PathBuf;
use sqlx::{Pool, Sqlite, SqlitePool, sqlite::SqliteConnectOptions};
use std::str::FromStr;

pub mod models;

pub use models::{Task, TaskStatus, CreateTask, UpdateTask};

#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error("SQLx error: {0}")]
    Sqlx(#[from] sqlx::Error),
    #[error("Migration error: {0}")]
    Migration(String),
    #[error("Database path error: {0}")]
    PathError(String),
}

pub async fn init_db() -> Result<Pool<Sqlite>, DbError> {
    let data_dir = get_data_dir();
    std::fs::create_dir_all(&data_dir).map_err(|e| DbError::PathError(e.to_string()))?;

    let db_path = data_dir.join("db.sqlite");
    let database_url = format!("sqlite://{}?mode=rwc", db_path.to_string_lossy());

    let options = SqliteConnectOptions::from_str(&database_url)?
        .create_if_missing(true);

    let pool = SqlitePool::connect_with(options).await?;

    run_migrations(&pool).await?;

    Ok(pool)
}

pub fn get_data_dir() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".eval-kanban"))
        .unwrap_or_else(|| PathBuf::from(".eval-kanban"))
}

pub fn get_worktrees_dir() -> PathBuf {
    get_data_dir().join("worktrees")
}

async fn run_migrations(pool: &Pool<Sqlite>) -> Result<(), DbError> {
    // Migration 001: Create tasks table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'todo',
            error_message TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)")
        .execute(pool)
        .await
        .map_err(|e| DbError::Migration(e.to_string()))?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC)")
        .execute(pool)
        .await
        .map_err(|e| DbError::Migration(e.to_string()))?;

    // Migration 002: Add worktree fields
    // Check if columns exist before adding
    let columns: Vec<(String,)> = sqlx::query_as("PRAGMA table_info(tasks)")
        .fetch_all(pool)
        .await
        .map_err(|e| DbError::Migration(e.to_string()))?;

    let column_names: Vec<&str> = columns.iter().map(|(n,)| n.as_str()).collect();

    if !column_names.contains(&"branch_name") {
        sqlx::query("ALTER TABLE tasks ADD COLUMN branch_name TEXT")
            .execute(pool)
            .await
            .map_err(|e| DbError::Migration(e.to_string()))?;
    }

    if !column_names.contains(&"worktree_path") {
        sqlx::query("ALTER TABLE tasks ADD COLUMN worktree_path TEXT")
            .execute(pool)
            .await
            .map_err(|e| DbError::Migration(e.to_string()))?;
    }

    tracing::info!("Database migrations completed");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_data_dir() {
        let dir = get_data_dir();
        assert!(dir.to_string_lossy().contains(".eval-kanban"));
    }
}
