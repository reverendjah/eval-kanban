use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Pool, Sqlite};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Todo,
    InProgress,
    Review,
    Done,
}

impl TaskStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            TaskStatus::Todo => "todo",
            TaskStatus::InProgress => "in_progress",
            TaskStatus::Review => "review",
            TaskStatus::Done => "done",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "todo" => Some(TaskStatus::Todo),
            "in_progress" => Some(TaskStatus::InProgress),
            "review" => Some(TaskStatus::Review),
            "done" => Some(TaskStatus::Done),
            _ => None,
        }
    }
}

impl std::fmt::Display for TaskStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TaskRow {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
    pub branch_name: Option<String>,
    pub worktree_path: Option<String>,
    pub project_path: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: TaskStatus,
    pub error_message: Option<String>,
    pub branch_name: Option<String>,
    pub worktree_path: Option<String>,
    pub project_path: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<TaskRow> for Task {
    fn from(row: TaskRow) -> Self {
        Task {
            id: row.id,
            title: row.title,
            description: row.description,
            status: TaskStatus::from_str(&row.status).unwrap_or(TaskStatus::Todo),
            error_message: row.error_message,
            branch_name: row.branch_name,
            worktree_path: row.worktree_path,
            project_path: row.project_path,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateTask {
    pub title: String,
    pub description: Option<String>,
    pub project_path: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateTask {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<TaskStatus>,
    pub error_message: Option<String>,
    pub branch_name: Option<String>,
    pub worktree_path: Option<String>,
}

impl Task {
    pub async fn create(pool: &Pool<Sqlite>, input: CreateTask) -> Result<Task, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        sqlx::query(
            r#"
            INSERT INTO tasks (id, title, description, status, project_path, created_at, updated_at)
            VALUES (?, ?, ?, 'todo', ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&input.title)
        .bind(&input.description)
        .bind(&input.project_path)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await?;

        Ok(Task {
            id,
            title: input.title,
            description: input.description,
            status: TaskStatus::Todo,
            error_message: None,
            branch_name: None,
            worktree_path: None,
            project_path: Some(input.project_path),
            created_at: now,
            updated_at: now,
        })
    }

    pub async fn find_by_id(pool: &Pool<Sqlite>, id: &str) -> Result<Option<Task>, sqlx::Error> {
        let row: Option<TaskRow> = sqlx::query_as(
            "SELECT id, title, description, status, error_message, branch_name, worktree_path, project_path, created_at, updated_at FROM tasks WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(row.map(Task::from))
    }

    pub async fn find_all(pool: &Pool<Sqlite>) -> Result<Vec<Task>, sqlx::Error> {
        let rows: Vec<TaskRow> = sqlx::query_as(
            "SELECT id, title, description, status, error_message, branch_name, worktree_path, project_path, created_at, updated_at FROM tasks ORDER BY created_at DESC"
        )
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(Task::from).collect())
    }

    pub async fn find_all_by_project(pool: &Pool<Sqlite>, project_path: &str) -> Result<Vec<Task>, sqlx::Error> {
        let rows: Vec<TaskRow> = sqlx::query_as(
            "SELECT id, title, description, status, error_message, branch_name, worktree_path, project_path, created_at, updated_at FROM tasks WHERE project_path = ? ORDER BY created_at DESC"
        )
        .bind(project_path)
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(Task::from).collect())
    }

    pub async fn update(
        pool: &Pool<Sqlite>,
        id: &str,
        input: UpdateTask,
    ) -> Result<Option<Task>, sqlx::Error> {
        let existing = Self::find_by_id(pool, id).await?;
        if existing.is_none() {
            return Ok(None);
        }

        let existing = existing.unwrap();
        let now = Utc::now();

        let title = input.title.unwrap_or(existing.title);
        let description = input.description.or(existing.description);
        let status = input.status.unwrap_or(existing.status);
        let error_message = input.error_message.or(existing.error_message);
        let branch_name = input.branch_name.or(existing.branch_name);
        let worktree_path = input.worktree_path.or(existing.worktree_path);

        sqlx::query(
            r#"
            UPDATE tasks
            SET title = ?, description = ?, status = ?, error_message = ?, branch_name = ?, worktree_path = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&title)
        .bind(&description)
        .bind(status.as_str())
        .bind(&error_message)
        .bind(&branch_name)
        .bind(&worktree_path)
        .bind(now)
        .bind(id)
        .execute(pool)
        .await?;

        Ok(Some(Task {
            id: id.to_string(),
            title,
            description,
            status,
            error_message,
            branch_name,
            worktree_path,
            project_path: existing.project_path,
            created_at: existing.created_at,
            updated_at: now,
        }))
    }

    pub async fn delete(pool: &Pool<Sqlite>, id: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM tasks WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn set_status(
        pool: &Pool<Sqlite>,
        id: &str,
        status: TaskStatus,
    ) -> Result<Option<Task>, sqlx::Error> {
        Self::update(
            pool,
            id,
            UpdateTask {
                title: None,
                description: None,
                status: Some(status),
                error_message: None,
                branch_name: None,
                worktree_path: None,
            },
        )
        .await
    }

    pub async fn set_error(
        pool: &Pool<Sqlite>,
        id: &str,
        error_message: String,
    ) -> Result<Option<Task>, sqlx::Error> {
        Self::update(
            pool,
            id,
            UpdateTask {
                title: None,
                description: None,
                status: Some(TaskStatus::Review),
                error_message: Some(error_message),
                branch_name: None,
                worktree_path: None,
            },
        )
        .await
    }

    pub async fn set_worktree(
        pool: &Pool<Sqlite>,
        id: &str,
        branch_name: String,
        worktree_path: String,
    ) -> Result<Option<Task>, sqlx::Error> {
        Self::update(
            pool,
            id,
            UpdateTask {
                title: None,
                description: None,
                status: None,
                error_message: None,
                branch_name: Some(branch_name),
                worktree_path: Some(worktree_path),
            },
        )
        .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn setup_test_db() -> Pool<Sqlite> {
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();

        sqlx::query(
            r#"
            CREATE TABLE tasks (
                id TEXT PRIMARY KEY NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'todo',
                error_message TEXT,
                branch_name TEXT,
                worktree_path TEXT,
                project_path TEXT,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_create_task() {
        let pool = setup_test_db().await;

        let task = Task::create(
            &pool,
            CreateTask {
                title: "Test Task".to_string(),
                description: Some("Test Description".to_string()),
                project_path: "/test/project".to_string(),
            },
        )
        .await
        .unwrap();

        assert_eq!(task.title, "Test Task");
        assert_eq!(task.description, Some("Test Description".to_string()));
        assert_eq!(task.status, TaskStatus::Todo);
        assert!(task.error_message.is_none());
    }

    #[tokio::test]
    async fn test_find_by_id() {
        let pool = setup_test_db().await;

        let created = Task::create(
            &pool,
            CreateTask {
                title: "Find Me".to_string(),
                description: None,
                project_path: "/test/project".to_string(),
            },
        )
        .await
        .unwrap();

        let found = Task::find_by_id(&pool, &created.id).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().title, "Find Me");

        let not_found = Task::find_by_id(&pool, "nonexistent").await.unwrap();
        assert!(not_found.is_none());
    }

    #[tokio::test]
    async fn test_find_all() {
        let pool = setup_test_db().await;

        Task::create(
            &pool,
            CreateTask {
                title: "Task 1".to_string(),
                description: None,
                project_path: "/test/project".to_string(),
            },
        )
        .await
        .unwrap();

        Task::create(
            &pool,
            CreateTask {
                title: "Task 2".to_string(),
                description: None,
                project_path: "/test/project".to_string(),
            },
        )
        .await
        .unwrap();

        let tasks = Task::find_all(&pool).await.unwrap();
        assert_eq!(tasks.len(), 2);
    }

    #[tokio::test]
    async fn test_update_task() {
        let pool = setup_test_db().await;

        let created = Task::create(
            &pool,
            CreateTask {
                title: "Original".to_string(),
                description: None,
                project_path: "/test/project".to_string(),
            },
        )
        .await
        .unwrap();

        let updated = Task::update(
            &pool,
            &created.id,
            UpdateTask {
                title: Some("Updated".to_string()),
                description: Some("New description".to_string()),
                status: Some(TaskStatus::InProgress),
                error_message: None,
                branch_name: None,
                worktree_path: None,
            },
        )
        .await
        .unwrap()
        .unwrap();

        assert_eq!(updated.title, "Updated");
        assert_eq!(updated.description, Some("New description".to_string()));
        assert_eq!(updated.status, TaskStatus::InProgress);
    }

    #[tokio::test]
    async fn test_set_worktree() {
        let pool = setup_test_db().await;

        let created = Task::create(
            &pool,
            CreateTask {
                title: "Worktree Test".to_string(),
                description: None,
                project_path: "/test/project".to_string(),
            },
        )
        .await
        .unwrap();

        let updated = Task::set_worktree(
            &pool,
            &created.id,
            "ek/worktree-test".to_string(),
            "/path/to/worktree".to_string(),
        )
        .await
        .unwrap()
        .unwrap();

        assert_eq!(updated.branch_name, Some("ek/worktree-test".to_string()));
        assert_eq!(updated.worktree_path, Some("/path/to/worktree".to_string()));
    }

    #[tokio::test]
    async fn test_delete_task() {
        let pool = setup_test_db().await;

        let created = Task::create(
            &pool,
            CreateTask {
                title: "Delete Me".to_string(),
                description: None,
                project_path: "/test/project".to_string(),
            },
        )
        .await
        .unwrap();

        let deleted = Task::delete(&pool, &created.id).await.unwrap();
        assert!(deleted);

        let found = Task::find_by_id(&pool, &created.id).await.unwrap();
        assert!(found.is_none());
    }

    #[tokio::test]
    async fn test_set_status() {
        let pool = setup_test_db().await;

        let created = Task::create(
            &pool,
            CreateTask {
                title: "Status Test".to_string(),
                description: None,
                project_path: "/test/project".to_string(),
            },
        )
        .await
        .unwrap();

        let updated = Task::set_status(&pool, &created.id, TaskStatus::Done)
            .await
            .unwrap()
            .unwrap();

        assert_eq!(updated.status, TaskStatus::Done);
    }

    #[tokio::test]
    async fn test_set_error() {
        let pool = setup_test_db().await;

        let created = Task::create(
            &pool,
            CreateTask {
                title: "Error Test".to_string(),
                description: None,
                project_path: "/test/project".to_string(),
            },
        )
        .await
        .unwrap();

        let updated = Task::set_error(&pool, &created.id, "Something went wrong".to_string())
            .await
            .unwrap()
            .unwrap();

        assert_eq!(updated.status, TaskStatus::Review);
        assert_eq!(
            updated.error_message,
            Some("Something went wrong".to_string())
        );
    }

    #[test]
    fn test_task_status_conversion() {
        assert_eq!(TaskStatus::Todo.as_str(), "todo");
        assert_eq!(TaskStatus::InProgress.as_str(), "in_progress");
        assert_eq!(TaskStatus::Review.as_str(), "review");
        assert_eq!(TaskStatus::Done.as_str(), "done");

        assert_eq!(TaskStatus::from_str("todo"), Some(TaskStatus::Todo));
        assert_eq!(
            TaskStatus::from_str("in_progress"),
            Some(TaskStatus::InProgress)
        );
        assert_eq!(TaskStatus::from_str("review"), Some(TaskStatus::Review));
        assert_eq!(TaskStatus::from_str("done"), Some(TaskStatus::Done));
        assert_eq!(TaskStatus::from_str("invalid"), None);
    }
}
