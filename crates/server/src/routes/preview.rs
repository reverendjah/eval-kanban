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
        .route("/tasks/:id/preview/restart/:server", post(restart_server))
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
    // Get cargo path from CARGO_HOME or default locations (using PathBuf for cross-platform)
    let cargo_path = std::env::var("CARGO_HOME")
        .map(|home| PathBuf::from(home).join("bin").join("cargo"))
        .unwrap_or_else(|_| {
            if cfg!(windows) {
                std::env::var("USERPROFILE")
                    .map(|home| PathBuf::from(home).join(".cargo").join("bin").join("cargo.exe"))
                    .unwrap_or_else(|_| PathBuf::from("cargo"))
            } else {
                std::env::var("HOME")
                    .map(|home| PathBuf::from(home).join(".cargo").join("bin").join("cargo"))
                    .unwrap_or_else(|_| PathBuf::from("cargo"))
            }
        });

    let backend_process = if cfg!(windows) {
        Command::new(&cargo_path)
            .args(["run", "--release", "-p", "eval-kanban-server"])
            .env("PORT", backend_port.to_string())
            .current_dir(&worktree_path)
            .kill_on_drop(true)
            .spawn()
    } else {
        Command::new(&cargo_path)
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
        // Check if node_modules exists, if not run npm install first (in blocking task)
        let node_modules = frontend_dir.join("node_modules");
        if !node_modules.exists() {
            tracing::info!("Installing frontend dependencies in worktree (this may take a minute)...");
            let frontend_dir_clone = frontend_dir.clone();
            let install_result = tokio::task::spawn_blocking(move || {
                if cfg!(windows) {
                    std::process::Command::new("cmd")
                        .args(["/C", "npm", "install"])
                        .current_dir(&frontend_dir_clone)
                        .output()
                } else {
                    std::process::Command::new("npm")
                        .args(["install"])
                        .current_dir(&frontend_dir_clone)
                        .output()
                }
            }).await;

            match install_result {
                Ok(Ok(output)) => {
                    if !output.status.success() {
                        tracing::warn!("npm install failed: {}", String::from_utf8_lossy(&output.stderr));
                    } else {
                        tracing::info!("Frontend dependencies installed successfully");
                    }
                }
                Ok(Err(e)) => {
                    tracing::warn!("Failed to run npm install: {}", e);
                }
                Err(e) => {
                    tracing::warn!("npm install task panicked: {}", e);
                }
            }
        }

        let process = if cfg!(windows) {
            Command::new("cmd")
                .args(["/C", "npm", "run", "dev", "--", "--port", &frontend_port.to_string(), "--host"])
                .current_dir(&frontend_dir)
                .kill_on_drop(true)
                .spawn()
        } else {
            Command::new("npm")
                .args(["run", "dev", "--", "--port", &frontend_port.to_string(), "--host"])
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

#[derive(serde::Deserialize)]
struct RestartParams {
    id: String,
    server: String, // "backend" or "frontend"
}

async fn restart_server(
    State(state): State<Arc<AppState>>,
    Path(params): Path<RestartParams>,
) -> Result<Json<PreviewInfo>, (StatusCode, Json<ErrorResponse>)> {
    let RestartParams { id, server } = params;

    // Validate server type
    if server != "backend" && server != "frontend" {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Server must be 'backend' or 'frontend'".to_string(),
            }),
        ));
    }

    // Get current preview info
    let current_preview = state.remove_preview(&id).await;
    let preview = match current_preview {
        Some(p) => p,
        None => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ErrorResponse {
                    error: "No preview running for this task".to_string(),
                }),
            ));
        }
    };

    // Get task for worktree path
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

    // Drop old processes (they will be killed due to kill_on_drop)
    let PreviewProcess {
        backend_port: old_backend_port,
        frontend_port: old_frontend_port,
        backend_process: old_backend,
        frontend_process: old_frontend,
        ..
    } = preview;

    let (backend_port, backend_process, frontend_port, frontend_process) = if server == "backend" {
        // Restart only backend - find new port if old one is occupied
        drop(old_backend); // Kill old backend
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        let new_backend_port = find_available_port(9900, 100).ok_or_else(|| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(ErrorResponse {
                    error: "No available ports for backend".to_string(),
                }),
            )
        })?;

        let cargo_path = get_cargo_path();
        let new_backend = Command::new(&cargo_path)
            .args(["run", "--release", "-p", "eval-kanban-server"])
            .env("PORT", new_backend_port.to_string())
            .current_dir(&worktree_path)
            .kill_on_drop(true)
            .spawn()
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to restart backend: {}", e),
                    }),
                )
            })?;

        (new_backend_port, new_backend, old_frontend_port, old_frontend)
    } else {
        // Restart only frontend - find new port if old one is occupied
        drop(old_frontend); // Kill old frontend
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        let new_frontend_port = find_available_port(5200, 100).ok_or_else(|| {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(ErrorResponse {
                    error: "No available ports for frontend".to_string(),
                }),
            )
        })?;

        let frontend_dir = worktree_path.join("frontend");
        let new_frontend = if frontend_dir.exists() {
            let process = if cfg!(windows) {
                Command::new("cmd")
                    .args(["/C", "npm", "run", "dev", "--", "--port", &new_frontend_port.to_string(), "--host"])
                    .current_dir(&frontend_dir)
                    .kill_on_drop(true)
                    .spawn()
            } else {
                Command::new("npm")
                    .args(["run", "dev", "--", "--port", &new_frontend_port.to_string(), "--host"])
                    .current_dir(&frontend_dir)
                    .kill_on_drop(true)
                    .spawn()
            };

            match process {
                Ok(p) => Some(p),
                Err(e) => {
                    return Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ErrorResponse {
                            error: format!("Failed to restart frontend: {}", e),
                        }),
                    ));
                }
            }
        } else {
            None
        };

        (old_backend_port, old_backend, new_frontend_port, new_frontend)
    };

    let new_preview = PreviewProcess {
        task_id: id.clone(),
        backend_port,
        frontend_port,
        backend_process,
        frontend_process,
    };

    let info = new_preview.to_info(PreviewStatus::Starting);
    state.add_preview(id.clone(), new_preview).await;

    tracing::info!(
        "Restarted {} server for task {} - backend: {}, frontend: {}",
        server,
        id,
        info.backend_url,
        info.frontend_url
    );

    Ok(Json(info))
}

fn get_cargo_path() -> PathBuf {
    std::env::var("CARGO_HOME")
        .map(|home| PathBuf::from(home).join("bin").join("cargo"))
        .unwrap_or_else(|_| {
            if cfg!(windows) {
                std::env::var("USERPROFILE")
                    .map(|home| PathBuf::from(home).join(".cargo").join("bin").join("cargo.exe"))
                    .unwrap_or_else(|_| PathBuf::from("cargo"))
            } else {
                std::env::var("HOME")
                    .map(|home| PathBuf::from(home).join(".cargo").join("bin").join("cargo"))
                    .unwrap_or_else(|_| PathBuf::from("cargo"))
            }
        })
}
