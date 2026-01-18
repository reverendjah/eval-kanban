use std::sync::Arc;
use std::time::Duration;
use axum::{
    Router,
    extract::State,
    http::StatusCode,
    routing::post,
};

use crate::state::AppState;

pub fn server_router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/restart", post(restart_server))
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
