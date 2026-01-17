use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use sqlx::{Pool, Sqlite};
use tokio::sync::{broadcast, RwLock, mpsc};
use tokio::process::Child;
use serde::Serialize;

use eval_kanban_worktree::WorktreeManager;
use crate::routes::ws::WsMessage;

pub struct RunningTask {
    pub task_id: String,
    pub cancel_tx: mpsc::Sender<()>,
}

// Preview types defined here to avoid circular dependency
#[derive(Debug, Clone, Serialize)]
pub struct PreviewInfo {
    pub task_id: String,
    pub backend_url: String,
    pub frontend_url: String,
    pub backend_port: u16,
    pub frontend_port: u16,
    pub status: PreviewStatus,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PreviewStatus {
    Starting,
    Running,
    Stopped,
    Error,
}

pub struct PreviewProcess {
    pub task_id: String,
    pub backend_port: u16,
    pub frontend_port: u16,
    pub backend_process: Child,
    pub frontend_process: Option<Child>,
}

impl PreviewProcess {
    pub fn to_info(&self, status: PreviewStatus) -> PreviewInfo {
        PreviewInfo {
            task_id: self.task_id.clone(),
            backend_url: format!("http://127.0.0.1:{}", self.backend_port),
            frontend_url: format!("http://127.0.0.1:{}", self.frontend_port),
            backend_port: self.backend_port,
            frontend_port: self.frontend_port,
            status,
        }
    }
}

pub struct AppState {
    pub db: Pool<Sqlite>,
    pub working_dir: PathBuf,
    pub worktree_manager: WorktreeManager,
    pub ws_broadcast: broadcast::Sender<WsMessage>,
    pub running_tasks: RwLock<HashMap<String, RunningTask>>,
    pub preview_processes: RwLock<HashMap<String, PreviewProcess>>,
}

impl AppState {
    pub fn new(db: Pool<Sqlite>, working_dir: PathBuf) -> Arc<Self> {
        let (ws_broadcast, _) = broadcast::channel(100);

        let worktrees_base_dir = eval_kanban_db::get_worktrees_dir();
        let worktree_manager = WorktreeManager::new(working_dir.clone(), worktrees_base_dir);

        Arc::new(Self {
            db,
            working_dir,
            worktree_manager,
            ws_broadcast,
            running_tasks: RwLock::new(HashMap::new()),
            preview_processes: RwLock::new(HashMap::new()),
        })
    }

    pub async fn broadcast(&self, msg: WsMessage) {
        let _ = self.ws_broadcast.send(msg);
    }

    pub async fn add_running_task(&self, task_id: String, cancel_tx: mpsc::Sender<()>) {
        let mut tasks = self.running_tasks.write().await;
        tasks.insert(task_id.clone(), RunningTask { task_id, cancel_tx });
    }

    pub async fn remove_running_task(&self, task_id: &str) -> Option<RunningTask> {
        let mut tasks = self.running_tasks.write().await;
        tasks.remove(task_id)
    }

    pub async fn is_task_running(&self, task_id: &str) -> bool {
        let tasks = self.running_tasks.read().await;
        tasks.contains_key(task_id)
    }

    // Preview process management
    pub async fn add_preview(&self, task_id: String, process: PreviewProcess) {
        let mut previews = self.preview_processes.write().await;
        previews.insert(task_id, process);
    }

    pub async fn remove_preview(&self, task_id: &str) -> Option<PreviewProcess> {
        let mut previews = self.preview_processes.write().await;
        previews.remove(task_id)
    }

    pub async fn is_preview_running(&self, task_id: &str) -> bool {
        let previews = self.preview_processes.read().await;
        previews.contains_key(task_id)
    }

    pub async fn get_preview_info(&self, task_id: &str) -> Option<PreviewInfo> {
        let previews = self.preview_processes.read().await;
        previews.get(task_id).map(|p| p.to_info(PreviewStatus::Running))
    }

    pub async fn cleanup_all_previews(&self) {
        let mut previews = self.preview_processes.write().await;
        for (task_id, _process) in previews.drain() {
            tracing::info!("Cleaning up preview for task {}", task_id);
            // Processes will be killed on drop due to kill_on_drop(true)
        }
    }
}
