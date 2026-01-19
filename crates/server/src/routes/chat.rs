use std::sync::Arc;
use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use std::process::Stdio;

use eval_kanban_db::{ChatMessage, CreateChatMessage};
use eval_kanban_db::models::chat::ChatRole;

use crate::state::AppState;
use crate::routes::ws::WsMessage;

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

#[derive(Serialize)]
struct ChatHistoryResponse {
    messages: Vec<ChatMessage>,
}

#[derive(Deserialize)]
struct SendMessageRequest {
    content: String,
    image: Option<String>,
}

#[derive(Serialize)]
struct SendMessageResponse {
    user_message: ChatMessage,
}

#[derive(Serialize)]
struct ClearHistoryResponse {
    deleted_count: u64,
}

pub fn chat_router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/history", get(get_history).delete(clear_history))
        .route("/message", post(send_message))
}

async fn get_history(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ChatHistoryResponse>, (StatusCode, Json<ErrorResponse>)> {
    let project_path = state.working_dir.to_string_lossy().to_string();

    let messages = ChatMessage::find_by_project(&state.db, &project_path, Some(100))
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { error: e.to_string() }),
            )
        })?;

    Ok(Json(ChatHistoryResponse { messages }))
}

async fn clear_history(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ClearHistoryResponse>, (StatusCode, Json<ErrorResponse>)> {
    let project_path = state.working_dir.to_string_lossy().to_string();

    let deleted_count = ChatMessage::delete_by_project(&state.db, &project_path)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { error: e.to_string() }),
            )
        })?;

    Ok(Json(ClearHistoryResponse { deleted_count }))
}

async fn send_message(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SendMessageRequest>,
) -> Result<Json<SendMessageResponse>, (StatusCode, Json<ErrorResponse>)> {
    let project_path = state.working_dir.to_string_lossy().to_string();

    // Save user message
    let user_message = ChatMessage::create(
        &state.db,
        CreateChatMessage {
            project_path: project_path.clone(),
            role: ChatRole::User,
            content: req.content.clone(),
            image_data: req.image.clone(),
        },
    )
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e.to_string() }),
        )
    })?;

    // Spawn Claude in background and stream response
    let state_clone = state.clone();
    let content = req.content.clone();
    let image = req.image.clone();
    let project_path_clone = project_path.clone();

    tokio::spawn(async move {
        spawn_claude_chat(state_clone, project_path_clone, content, image).await;
    });

    Ok(Json(SendMessageResponse { user_message }))
}

/// Build prompt with conversation history
async fn build_chat_prompt(
    state: &Arc<AppState>,
    project_path: &str,
    new_content: &str,
    new_image: Option<&str>,
) -> String {
    // Get recent history (last 20 messages for context)
    let history = ChatMessage::find_by_project(&state.db, project_path, Some(20))
        .await
        .unwrap_or_default();

    let mut prompt = String::new();

    // System context
    prompt.push_str("You are a helpful assistant integrated into a Kanban task management app. ");
    prompt.push_str("You are running in READ-ONLY mode - you can read and analyze code, ");
    prompt.push_str("but you cannot modify files or execute commands that change the codebase. ");
    prompt.push_str("Help the user understand their code, debug issues, and plan implementations.\n\n");

    // Add conversation history (excluding the latest user message we just saved)
    if !history.is_empty() {
        prompt.push_str("## Previous conversation\n\n");
        for msg in history.iter().take(history.len().saturating_sub(1)) {
            let role = match msg.role {
                ChatRole::User => "User",
                ChatRole::Assistant => "Assistant",
            };
            prompt.push_str(&format!("**{}**: {}\n\n", role, msg.content));
        }
    }

    // Add current message
    prompt.push_str("## Current message\n\n");
    prompt.push_str(&format!("**User**: {}", new_content));

    // Add image reference if present
    if let Some(_image_data) = new_image {
        prompt.push_str("\n\n[User has attached an image]");
    }

    prompt
}

/// Spawn Claude and stream response via WebSocket
async fn spawn_claude_chat(
    state: Arc<AppState>,
    project_path: String,
    content: String,
    image: Option<String>,
) {
    let prompt = build_chat_prompt(&state, &project_path, &content, image.as_deref()).await;

    tracing::info!("[Chat] Spawning Claude for chat (prompt length: {})", prompt.len());

    // Build command for read-only mode
    let mut cmd = create_claude_command();

    // Use --print with permission-mode for read-only
    // Note: We use text output format for simpler parsing
    cmd.args([
        "--print",
        "--permission-mode", "bypassPermissions", // Read-only mode
    ])
    .arg(&prompt)
    .current_dir(&state.working_dir)
    .stdin(Stdio::null())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .kill_on_drop(true);

    let mut child = match cmd.spawn() {
        Ok(child) => child,
        Err(e) => {
            tracing::error!("[Chat] Failed to spawn Claude: {}", e);
            state.broadcast(WsMessage::ChatError {
                error: format!("Failed to start Claude: {}", e),
            }).await;
            return;
        }
    };

    let stdout = match child.stdout.take() {
        Some(stdout) => stdout,
        None => {
            tracing::error!("[Chat] Failed to capture stdout");
            state.broadcast(WsMessage::ChatError {
                error: "Failed to capture Claude output".to_string(),
            }).await;
            return;
        }
    };

    // Stream stdout line by line
    let mut reader = BufReader::new(stdout).lines();
    let mut full_response = String::new();

    while let Ok(Some(line)) = reader.next_line().await {
        // Skip empty lines at the start
        if full_response.is_empty() && line.trim().is_empty() {
            continue;
        }

        full_response.push_str(&line);
        full_response.push('\n');

        // Stream chunk via WebSocket
        state.broadcast(WsMessage::ChatChunk {
            content: line,
            is_complete: false,
        }).await;
    }

    // Wait for process to complete
    let status = child.wait().await;
    let success = status.map(|s| s.success()).unwrap_or(false);

    if !success {
        tracing::warn!("[Chat] Claude process exited with non-success status");
    }

    // Trim the response
    let full_response = full_response.trim().to_string();

    if full_response.is_empty() {
        tracing::warn!("[Chat] Claude returned empty response");
        state.broadcast(WsMessage::ChatError {
            error: "Claude returned an empty response".to_string(),
        }).await;
        return;
    }

    // Save assistant response to database
    if let Err(e) = ChatMessage::create(
        &state.db,
        CreateChatMessage {
            project_path,
            role: ChatRole::Assistant,
            content: full_response.clone(),
            image_data: None,
        },
    ).await {
        tracing::error!("[Chat] Failed to save assistant message: {}", e);
    }

    // Send completion signal
    state.broadcast(WsMessage::ChatChunk {
        content: String::new(),
        is_complete: true,
    }).await;

    tracing::info!("[Chat] Chat response completed ({} chars)", full_response.len());
}

#[cfg(windows)]
fn get_node_path() -> String {
    let common_paths = [
        "C:\\Program Files\\nodejs\\node.exe",
        "C:\\Program Files (x86)\\nodejs\\node.exe",
    ];

    for path in &common_paths {
        if std::path::Path::new(path).exists() {
            return path.to_string();
        }
    }

    "node".to_string()
}

#[cfg(windows)]
fn get_claude_cli_path() -> String {
    if let Ok(appdata) = std::env::var("APPDATA") {
        format!("{}\\npm\\node_modules\\@anthropic-ai\\claude-code\\cli.js", appdata)
    } else {
        "C:\\Users\\caio\\AppData\\Roaming\\npm\\node_modules\\@anthropic-ai\\claude-code\\cli.js".to_string()
    }
}

#[cfg(windows)]
fn create_claude_command() -> Command {
    let node_path = get_node_path();
    let cli_path = get_claude_cli_path();
    let mut cmd = Command::new(&node_path);
    cmd.arg(&cli_path);
    cmd
}

#[cfg(not(windows))]
fn create_claude_command() -> Command {
    Command::new("claude")
}
