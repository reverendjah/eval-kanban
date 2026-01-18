use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use sqlx::{Pool, Sqlite};
use tokio::sync::{broadcast, RwLock, mpsc};
use tokio::process::Child;
use serde::Serialize;

use eval_kanban_worktree::WorktreeManager;
use crate::routes::ws::WsMessage;
use crate::plan_session::{PlanSession, PlanSessionInfo};

pub struct RunningTask {
    #[allow(dead_code)]
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
#[allow(dead_code)]
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
            backend_url: format!("http://localhost:{}", self.backend_port),
            frontend_url: format!("http://localhost:{}", self.frontend_port),
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
    pub plan_sessions: RwLock<HashMap<String, PlanSession>>,
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
            plan_sessions: RwLock::new(HashMap::new()),
        })
    }

    pub async fn broadcast(&self, msg: WsMessage) {
        match self.ws_broadcast.send(msg) {
            Ok(receivers) => {
                tracing::debug!("[Broadcast] Message sent to {} receivers", receivers);
            }
            Err(e) => {
                // Only log if this is unexpected (no receivers is normal on startup)
                tracing::debug!("[Broadcast] No receivers for message: {:?}", e.0);
            }
        }
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

    #[allow(dead_code)]
    pub async fn cleanup_all_previews(&self) {
        let mut previews = self.preview_processes.write().await;
        for (task_id, _process) in previews.drain() {
            tracing::info!("Cleaning up preview for task {}", task_id);
            // Processes will be killed on drop due to kill_on_drop(true)
        }
    }

    // Plan session management
    pub async fn add_plan_session(&self, session: PlanSession) {
        let mut sessions = self.plan_sessions.write().await;
        sessions.insert(session.id.clone(), session);
    }

    pub async fn get_plan_session_info(&self, session_id: &str) -> Option<PlanSessionInfo> {
        let sessions = self.plan_sessions.read().await;
        sessions.get(session_id).map(|s| s.to_info())
    }

    pub async fn remove_plan_session(&self, session_id: &str) -> Option<PlanSession> {
        let mut sessions = self.plan_sessions.write().await;
        sessions.remove(session_id)
    }

    pub async fn update_plan_session<F>(&self, session_id: &str, f: F) -> bool
    where
        F: FnOnce(&mut PlanSession),
    {
        let mut sessions = self.plan_sessions.write().await;
        if let Some(session) = sessions.get_mut(session_id) {
            f(session);
            true
        } else {
            false
        }
    }

    #[allow(dead_code)]
    pub async fn cleanup_expired_sessions(&self, timeout_secs: u64) {
        let mut sessions = self.plan_sessions.write().await;
        let expired: Vec<String> = sessions
            .iter()
            .filter(|(_, s)| s.is_expired(timeout_secs))
            .map(|(id, _)| id.clone())
            .collect();

        for id in expired {
            tracing::info!("Cleaning up expired plan session {}", id);
            sessions.remove(&id);
        }
    }
}
