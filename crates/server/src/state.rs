use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use sqlx::{Pool, Sqlite};
use tokio::sync::{broadcast, RwLock, mpsc};

use eval_kanban_worktree::WorktreeManager;
use crate::routes::ws::WsMessage;

pub struct RunningTask {
    pub task_id: String,
    pub cancel_tx: mpsc::Sender<()>,
}

pub struct AppState {
    pub db: Pool<Sqlite>,
    pub working_dir: PathBuf,
    pub worktree_manager: WorktreeManager,
    pub ws_broadcast: broadcast::Sender<WsMessage>,
    pub running_tasks: RwLock<HashMap<String, RunningTask>>,
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
}
