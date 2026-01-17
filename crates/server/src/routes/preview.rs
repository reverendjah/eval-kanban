use std::sync::Arc;
use std::path::PathBuf;
use std::net::TcpListener;
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::post,
};
use serde::Serialize;
use tokio::process::Command;

use eval_kanban_db::Task;

use crate::state::{AppState, PreviewProcess, PreviewInfo, PreviewStatus};

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

pub fn preview_router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/tasks/:id/preview", post(start_preview).delete(stop_preview).get(get_preview_status))
}

/// Find an available port in the given range
fn find_available_port(start: u16, range: u16) -> Option<u16> {
    for port in start..(start + range) {
        if TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return Some(port);
        }
    }
    None
}

async fn start_preview(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<PreviewInfo>, (StatusCode, Json<ErrorResponse>)> {
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

    // Check if preview already running
    if state.is_preview_running(&id).await {
        return Err((
            StatusCode::CONFLICT,
            Json(ErrorResponse {
                error: "Preview already running for this task".to_string(),
            }),
        ));
    }

    // Allocate ports
    let backend_port = find_available_port(9900, 100).ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(ErrorResponse {
                error: "No available ports for backend".to_string(),
            }),
        )
    })?;

    let frontend_port = find_available_port(5200, 100).ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(ErrorResponse {
                error: "No available ports for frontend".to_string(),
            }),
        )
    })?;

    // Start backend process
    let backend_process = if cfg!(windows) {
        Command::new("cmd")
            .args(["/C", "cargo", "run", "--release", "-p", "eval-kanban-server"])
            .env("PORT", backend_port.to_string())
            .current_dir(&worktree_path)
            .kill_on_drop(true)
            .spawn()
    } else {
        Command::new("cargo")
            .args(["run", "--release", "-p", "eval-kanban-server"])
            .env("PORT", backend_port.to_string())
            .current_dir(&worktree_path)
            .kill_on_drop(true)
            .spawn()
    }.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to start backend: {}", e),
            }),
        )
    })?;

    // Start frontend dev server
    let frontend_dir = worktree_path.join("frontend");
    let frontend_process = if frontend_dir.exists() {
        let process = if cfg!(windows) {
            Command::new("cmd")
                .args(["/C", "npm", "run", "dev", "--", "--port", &frontend_port.to_string()])
                .current_dir(&frontend_dir)
                .kill_on_drop(true)
                .spawn()
        } else {
            Command::new("npm")
                .args(["run", "dev", "--", "--port", &frontend_port.to_string()])
                .current_dir(&frontend_dir)
                .kill_on_drop(true)
                .spawn()
        };

        match process {
            Ok(p) => Some(p),
            Err(e) => {
                tracing::warn!("Failed to start frontend dev server: {}", e);
                None
            }
        }
    } else {
        None
    };

    let preview = PreviewProcess {
        task_id: id.clone(),
        backend_port,
        frontend_port,
        backend_process,
        frontend_process,
    };

    let info = preview.to_info(PreviewStatus::Starting);
    state.add_preview(id, preview).await;

    tracing::info!(
        "Started preview for task - backend: {}, frontend: {}",
        info.backend_url,
        info.frontend_url
    );

    Ok(Json(info))
}

async fn stop_preview(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, Json<ErrorResponse>)> {
    let removed = state.remove_preview(&id).await;

    if removed.is_some() {
        tracing::info!("Stopped preview for task {}", id);
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "No preview running for this task".to_string(),
            }),
        ))
    }
}

async fn get_preview_status(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<PreviewInfo>, (StatusCode, Json<ErrorResponse>)> {
    let info = state.get_preview_info(&id).await;

    match info {
        Some(info) => Ok(Json(info)),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "No preview running for this task".to_string(),
            }),
        )),
    }
}
