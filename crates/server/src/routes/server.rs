use std::sync::Arc;
use std::time::Duration;
use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    routing::{get, post},
};
use serde::Serialize;

use crate::state::AppState;

#[derive(Serialize)]
pub struct ServerInfo {
    name: String,
    path: String,
}

pub fn server_router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/info", get(get_info))
        .route("/restart", post(restart_server))
}

async fn get_info(
    State(state): State<Arc<AppState>>,
) -> Json<ServerInfo> {
    let path = state.working_dir.to_string_lossy().to_string();
    let name = state.working_dir
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "root".to_string());

    Json(ServerInfo { name, path })
}

async fn restart_server(
    State(_state): State<Arc<AppState>>,
) -> StatusCode {
    tracing::info!("Server restart requested");

    // Get the current executable path
    let exe = match std::env::current_exe() {
        Ok(path) => path,
        Err(e) => {
            tracing::error!("Failed to get current executable: {}", e);
            return StatusCode::INTERNAL_SERVER_ERROR;
        }
    };

    // Get current working directory
    let cwd = match std::env::current_dir() {
        Ok(dir) => dir,
        Err(e) => {
            tracing::error!("Failed to get current directory: {}", e);
            return StatusCode::INTERNAL_SERVER_ERROR;
        }
    };

    tracing::info!("Spawning new server instance: {:?}", exe);

    // Spawn a new server process
    match std::process::Command::new(&exe)
        .current_dir(&cwd)
        .spawn()
    {
        Ok(_child) => {
            tracing::info!("New server instance spawned, scheduling shutdown");

            // Schedule graceful shutdown after a delay
            tokio::spawn(async {
                // Give the new process time to start and bind to a different port
                tokio::time::sleep(Duration::from_secs(2)).await;
                tracing::info!("Shutting down old server instance");
                std::process::exit(0);
            });

            StatusCode::OK
        }
        Err(e) => {
            tracing::error!("Failed to spawn new server: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
