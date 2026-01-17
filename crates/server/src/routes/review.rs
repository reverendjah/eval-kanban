use std::sync::Arc;
use std::path::PathBuf;
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::get,
};
use serde::Serialize;

use eval_kanban_db::Task;
use eval_kanban_worktree::{DiffResponse, get_worktree_diff};

use crate::state::AppState;

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

pub fn review_router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/tasks/:id/diff", get(get_task_diff))
}

async fn get_task_diff(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<DiffResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Find the task
    let task = Task::find_by_id(&state.db, &id).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: e.to_string(),
            }),
        )
    })?;

    let task = match task {
        Some(t) => t,
        None => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ErrorResponse {
                    error: "Task not found".to_string(),
                }),
            ))
        }
    };

    // Check if task has a worktree path
    let worktree_path = match task.worktree_path {
        Some(path) => PathBuf::from(path),
        None => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Task has no worktree".to_string(),
                }),
            ))
        }
    };

    // Check if worktree exists
    if !worktree_path.exists() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Worktree directory not found".to_string(),
            }),
        ));
    }

    // Get the diff using spawn_blocking since git operations can be slow
    let diff = tokio::task::spawn_blocking(move || {
        get_worktree_diff(&worktree_path)
    })
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to compute diff: {}", e),
            }),
        )
    })?
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Git diff failed: {}", e),
            }),
        )
    })?;

    Ok(Json(diff))
}
