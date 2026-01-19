use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Pool, Sqlite};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChatRole {
    User,
    Assistant,
}

impl ChatRole {
    pub fn as_str(&self) -> &'static str {
        match self {
            ChatRole::User => "user",
            ChatRole::Assistant => "assistant",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "user" => Some(ChatRole::User),
            "assistant" => Some(ChatRole::Assistant),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ChatMessageRow {
    pub id: String,
    pub project_path: String,
    pub role: String,
    pub content: String,
    pub image_data: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub project_path: String,
    pub role: ChatRole,
    pub content: String,
    pub image_data: Option<String>,
    pub created_at: DateTime<Utc>,
}

impl From<ChatMessageRow> for ChatMessage {
    fn from(row: ChatMessageRow) -> Self {
        ChatMessage {
            id: row.id,
            project_path: row.project_path,
            role: ChatRole::from_str(&row.role).unwrap_or(ChatRole::User),
            content: row.content,
            image_data: row.image_data,
            created_at: row.created_at,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateChatMessage {
    pub project_path: String,
    pub role: ChatRole,
    pub content: String,
    pub image_data: Option<String>,
}

impl ChatMessage {
    pub async fn create(pool: &Pool<Sqlite>, input: CreateChatMessage) -> Result<ChatMessage, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        sqlx::query(
            r#"
            INSERT INTO chat_messages (id, project_path, role, content, image_data, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&input.project_path)
        .bind(input.role.as_str())
        .bind(&input.content)
        .bind(&input.image_data)
        .bind(now)
        .execute(pool)
        .await?;

        Ok(ChatMessage {
            id,
            project_path: input.project_path,
            role: input.role,
            content: input.content,
            image_data: input.image_data,
            created_at: now,
        })
    }

    pub async fn find_by_project(
        pool: &Pool<Sqlite>,
        project_path: &str,
        limit: Option<i64>,
    ) -> Result<Vec<ChatMessage>, sqlx::Error> {
        let limit = limit.unwrap_or(100);
        let rows: Vec<ChatMessageRow> = sqlx::query_as(
            r#"
            SELECT id, project_path, role, content, image_data, created_at
            FROM chat_messages
            WHERE project_path = ?
            ORDER BY created_at ASC
            LIMIT ?
            "#,
        )
        .bind(project_path)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(ChatMessage::from).collect())
    }

    pub async fn delete_by_project(pool: &Pool<Sqlite>, project_path: &str) -> Result<u64, sqlx::Error> {
        let result = sqlx::query("DELETE FROM chat_messages WHERE project_path = ?")
            .bind(project_path)
            .execute(pool)
            .await?;

        Ok(result.rows_affected())
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
            CREATE TABLE chat_messages (
                id TEXT PRIMARY KEY NOT NULL,
                project_path TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                image_data TEXT,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_create_chat_message() {
        let pool = setup_test_db().await;

        let msg = ChatMessage::create(
            &pool,
            CreateChatMessage {
                project_path: "/test/project".to_string(),
                role: ChatRole::User,
                content: "Hello, Claude!".to_string(),
                image_data: None,
            },
        )
        .await
        .unwrap();

        assert_eq!(msg.content, "Hello, Claude!");
        assert_eq!(msg.role, ChatRole::User);
        assert_eq!(msg.project_path, "/test/project");
    }

    #[tokio::test]
    async fn test_create_message_with_image() {
        let pool = setup_test_db().await;

        let msg = ChatMessage::create(
            &pool,
            CreateChatMessage {
                project_path: "/test/project".to_string(),
                role: ChatRole::User,
                content: "Check this image".to_string(),
                image_data: Some("base64encodeddata".to_string()),
            },
        )
        .await
        .unwrap();

        assert_eq!(msg.image_data, Some("base64encodeddata".to_string()));
    }

    #[tokio::test]
    async fn test_find_by_project() {
        let pool = setup_test_db().await;

        // Create messages for different projects
        ChatMessage::create(
            &pool,
            CreateChatMessage {
                project_path: "/project/a".to_string(),
                role: ChatRole::User,
                content: "Message 1".to_string(),
                image_data: None,
            },
        )
        .await
        .unwrap();

        ChatMessage::create(
            &pool,
            CreateChatMessage {
                project_path: "/project/a".to_string(),
                role: ChatRole::Assistant,
                content: "Response 1".to_string(),
                image_data: None,
            },
        )
        .await
        .unwrap();

        ChatMessage::create(
            &pool,
            CreateChatMessage {
                project_path: "/project/b".to_string(),
                role: ChatRole::User,
                content: "Different project".to_string(),
                image_data: None,
            },
        )
        .await
        .unwrap();

        let messages = ChatMessage::find_by_project(&pool, "/project/a", None)
            .await
            .unwrap();
        assert_eq!(messages.len(), 2);
        assert_eq!(messages[0].content, "Message 1");
        assert_eq!(messages[1].content, "Response 1");

        let messages_b = ChatMessage::find_by_project(&pool, "/project/b", None)
            .await
            .unwrap();
        assert_eq!(messages_b.len(), 1);
    }

    #[tokio::test]
    async fn test_delete_by_project() {
        let pool = setup_test_db().await;

        ChatMessage::create(
            &pool,
            CreateChatMessage {
                project_path: "/project/a".to_string(),
                role: ChatRole::User,
                content: "To be deleted".to_string(),
                image_data: None,
            },
        )
        .await
        .unwrap();

        ChatMessage::create(
            &pool,
            CreateChatMessage {
                project_path: "/project/b".to_string(),
                role: ChatRole::User,
                content: "Should remain".to_string(),
                image_data: None,
            },
        )
        .await
        .unwrap();

        let deleted = ChatMessage::delete_by_project(&pool, "/project/a")
            .await
            .unwrap();
        assert_eq!(deleted, 1);

        let remaining = ChatMessage::find_by_project(&pool, "/project/a", None)
            .await
            .unwrap();
        assert!(remaining.is_empty());

        let other = ChatMessage::find_by_project(&pool, "/project/b", None)
            .await
            .unwrap();
        assert_eq!(other.len(), 1);
    }

    #[test]
    fn test_chat_role_conversion() {
        assert_eq!(ChatRole::User.as_str(), "user");
        assert_eq!(ChatRole::Assistant.as_str(), "assistant");

        assert_eq!(ChatRole::from_str("user"), Some(ChatRole::User));
        assert_eq!(ChatRole::from_str("assistant"), Some(ChatRole::Assistant));
        assert_eq!(ChatRole::from_str("invalid"), None);
    }
}
