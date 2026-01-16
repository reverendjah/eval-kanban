use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;

use axum::{Router, routing::get};
use sqlx::{Pool, Sqlite};
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use eval_kanban_db::Task;

mod routes;
mod state;

use routes::{tasks_router, ws_handler};
use state::AppState;

const DEFAULT_PORT: u16 = 9847;

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "eval_kanban_server=info,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let working_dir = std::env::current_dir().expect("Failed to get current directory");
    tracing::info!("Working directory: {}", working_dir.display());

    let db = match eval_kanban_db::init_db().await {
        Ok(pool) => pool,
        Err(e) => {
            tracing::error!("Failed to initialize database: {}", e);
            std::process::exit(1);
        }
    };

    let state = AppState::new(db.clone(), working_dir);

    // Cleanup orphan worktrees on startup
    tokio::spawn(cleanup_orphan_worktrees(db.clone(), state.clone()));

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let api_routes = Router::new()
        .nest("/tasks", tasks_router())
        .route("/ws", get(ws_handler));

    let frontend_dir = get_frontend_dir();
    tracing::info!("Frontend directory: {}", frontend_dir.display());

    let app = Router::new()
        .nest("/api", api_routes)
        .fallback_service(ServeDir::new(&frontend_dir).append_index_html_on_directories(true))
        .layer(cors)
        .with_state(state);

    let port = find_available_port(DEFAULT_PORT).await;
    let addr = SocketAddr::from(([127, 0, 0, 1], port));

    tracing::info!("Server starting at http://{}", addr);

    if open_browser(&format!("http://{}", addr)).is_err() {
        tracing::warn!("Failed to open browser automatically");
    }

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn get_frontend_dir() -> PathBuf {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()));

    let possible_paths = [
        exe_dir.as_ref().map(|p| p.join("frontend")),
        exe_dir.as_ref().map(|p| p.join("../frontend/dist")),
        Some(PathBuf::from("./frontend/dist")),
        Some(PathBuf::from("../frontend/dist")),
    ];

    for path in possible_paths.into_iter().flatten() {
        if path.join("index.html").exists() {
            return path;
        }
    }

    PathBuf::from("./frontend/dist")
}

async fn find_available_port(start_port: u16) -> u16 {
    for port in start_port..start_port + 10 {
        if tokio::net::TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], port)))
            .await
            .is_ok()
        {
            return port;
        }
    }
    start_port
}

fn open_browser(url: &str) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", url])
            .spawn()?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open").arg(url).spawn()?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open").arg(url).spawn()?;
    }

    Ok(())
}

async fn cleanup_orphan_worktrees(db: Pool<Sqlite>, state: Arc<AppState>) {
    tracing::info!("Starting orphan worktree cleanup");

    // Get all valid worktree paths from tasks
    let valid_paths: Vec<String> = match Task::find_all(&db).await {
        Ok(tasks) => tasks
            .into_iter()
            .filter_map(|t| t.worktree_path)
            .collect(),
        Err(e) => {
            tracing::error!("Failed to fetch tasks for cleanup: {}", e);
            return;
        }
    };

    // Cleanup orphans
    match state.worktree_manager.cleanup_orphans(&valid_paths).await {
        Ok(removed) => {
            if !removed.is_empty() {
                tracing::info!("Removed {} orphan worktrees", removed.len());
            }
        }
        Err(e) => {
            tracing::error!("Failed to cleanup orphan worktrees: {}", e);
        }
    }
}
