use std::sync::Arc;
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

use eval_kanban_db::{CreateTask, Task, TaskStatus, UpdateTask};
use eval_kanban_executor::{ClaudeExecutor, ExecutorEvent};

use crate::state::AppState;
use crate::routes::ws::WsMessage;

#[derive(Serialize)]
struct TaskResponse {
    #[serde(flatten)]
    task: Task,
}

#[derive(Serialize)]
struct TasksResponse {
    tasks: Vec<Task>,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

#[derive(Deserialize)]
struct CreateTaskRequest {
    title: String,
    description: Option<String>,
}

#[derive(Deserialize)]
struct UpdateTaskRequest {
    title: Option<String>,
    description: Option<String>,
    status: Option<TaskStatus>,
}

pub fn tasks_router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_tasks).post(create_task))
        .route("/:id", get(get_task).patch(update_task).delete(delete_task))
        .route("/:id/start", post(start_task))
        .route("/:id/cancel", post(cancel_task))
        .route("/:id/complete", post(complete_task))
        .route("/:id/merge", post(merge_task))
}

async fn list_tasks(
    State(state): State<Arc<AppState>>,
) -> Result<Json<TasksResponse>, (StatusCode, Json<ErrorResponse>)> {
    let project_path = state.working_dir.to_string_lossy().to_string();
    let tasks = Task::find_all_by_project(&state.db, &project_path).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: e.to_string(),
            }),
        )
    })?;

    Ok(Json(TasksResponse { tasks }))
}

async fn get_task(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<TaskResponse>, (StatusCode, Json<ErrorResponse>)> {
    let task = Task::find_by_id(&state.db, &id).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: e.to_string(),
            }),
        )
    })?;

    match task {
        Some(task) => Ok(Json(TaskResponse { task })),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Task not found".to_string(),
            }),
        )),
    }
}

async fn create_task(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateTaskRequest>,
) -> Result<(StatusCode, Json<TaskResponse>), (StatusCode, Json<ErrorResponse>)> {
    if req.title.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Title is required".to_string(),
            }),
        ));
    }

    let project_path = state.working_dir.to_string_lossy().to_string();
    let task = Task::create(
        &state.db,
        CreateTask {
            title: req.title,
            description: req.description,
            project_path,
        },
    )
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: e.to_string(),
            }),
        )
    })?;

    state.broadcast(WsMessage::TaskUpdated { task: task.clone() }).await;

    Ok((StatusCode::CREATED, Json(TaskResponse { task })))
}

async fn update_task(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(req): Json<UpdateTaskRequest>,
) -> Result<Json<TaskResponse>, (StatusCode, Json<ErrorResponse>)> {
    let task = Task::update(
        &state.db,
        &id,
        UpdateTask {
            title: req.title,
            description: req.description,
            status: req.status,
            error_message: None,
            branch_name: None,
            worktree_path: None,
        },
    )
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: e.to_string(),
            }),
        )
    })?;

    match task {
        Some(task) => {
            state.broadcast(WsMessage::TaskUpdated { task: task.clone() }).await;
            Ok(Json(TaskResponse { task }))
        }
        None => Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Task not found".to_string(),
            }),
        )),
    }
}

async fn delete_task(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, Json<ErrorResponse>)> {
    let deleted = Task::delete(&state.db, &id).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: e.to_string(),
            }),
        )
    })?;

    if deleted {
        state.broadcast(WsMessage::TaskDeleted { task_id: id }).await;
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Task not found".to_string(),
            }),
        ))
    }
}

async fn start_task(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<TaskResponse>, (StatusCode, Json<ErrorResponse>)> {
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

    if state.is_task_running(&id).await {
        return Err((
            StatusCode::CONFLICT,
            Json(ErrorResponse {
                error: "Task is already running".to_string(),
            }),
        ));
    }

    // Create worktree if in a git repo
    let (working_dir, branch_name, worktree_path) = if state.worktree_manager.is_git_repo() {
        match state.worktree_manager.create_worktree(&task.title, &task.id).await {
            Ok((branch, wt_path)) => {
                tracing::info!("Created worktree for task {}: {} at {}", id, branch, wt_path.display());

                // Update task with worktree info
                if let Ok(Some(updated_task)) = Task::set_worktree(
                    &state.db,
                    &id,
                    branch.clone(),
                    wt_path.to_string_lossy().to_string(),
                ).await {
                    state.broadcast(WsMessage::TaskUpdated { task: updated_task }).await;
                }

                (wt_path.clone(), Some(branch), Some(wt_path.to_string_lossy().to_string()))
            }
            Err(e) => {
                tracing::warn!("Failed to create worktree, using main directory: {}", e);
                (state.working_dir.clone(), None, None)
            }
        }
    } else {
        tracing::info!("Not a git repo, running in main directory");
        (state.working_dir.clone(), None, None)
    };

    let updated = Task::set_status(&state.db, &id, TaskStatus::InProgress)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: e.to_string(),
                }),
            )
        })?
        .unwrap();

    // Update with branch info if available
    let updated = if branch_name.is_some() || worktree_path.is_some() {
        Task {
            branch_name: branch_name.or(updated.branch_name),
            worktree_path: worktree_path.or(updated.worktree_path),
            ..updated
        }
    } else {
        updated
    };

    state.broadcast(WsMessage::TaskUpdated { task: updated.clone() }).await;

    let prompt = task.description.clone().unwrap_or_else(|| task.title.clone());
    let executor = ClaudeExecutor::new(working_dir);

    let state_clone = state.clone();
    let task_id = id.clone();

    let (cancel_tx, mut cancel_rx) = mpsc::channel::<()>(1);
    state.add_running_task(id.clone(), cancel_tx).await;

    tokio::spawn(async move {
        match executor.spawn(&prompt).await {
            Ok((mut rx, process)) => {
                let state_for_wait = state_clone.clone();
                let task_id_for_wait = task_id.clone();

                let wait_handle = tokio::spawn(async move {
                    process.wait().await
                });

                loop {
                    tokio::select! {
                        Some(event) = rx.recv() => {
                            match event {
                                ExecutorEvent::Stdout(line) => {
                                    state_clone.broadcast(WsMessage::Log {
                                        task_id: task_id.clone(),
                                        content: line,
                                        stream: "stdout".to_string(),
                                    }).await;
                                }
                                ExecutorEvent::Stderr(line) => {
                                    state_clone.broadcast(WsMessage::Log {
                                        task_id: task_id.clone(),
                                        content: line,
                                        stream: "stderr".to_string(),
                                    }).await;
                                }
                                ExecutorEvent::Completed { success } => {
                                    tracing::info!("Task {} executor completed with success={}", task_id, success);

                                    let task_result = if success {
                                        Task::set_status(
                                            &state_clone.db,
                                            &task_id,
                                            TaskStatus::Review,
                                        ).await
                                    } else {
                                        Task::set_error(
                                            &state_clone.db,
                                            &task_id,
                                            "Executor completed with non-zero exit code".to_string(),
                                        ).await
                                    };

                                    if let Ok(Some(task)) = task_result {
                                        state_clone.broadcast(WsMessage::TaskUpdated { task }).await;
                                    }

                                    state_clone.broadcast(WsMessage::ExecutionComplete {
                                        task_id: task_id.clone(),
                                        success,
                                    }).await;

                                    state_clone.remove_running_task(&task_id).await;
                                    break;
                                }
                                _ => {}
                            }
                        }
                        _ = cancel_rx.recv() => {
                            tracing::info!("Task {} cancelled", task_id);
                            drop(wait_handle);

                            if let Ok(Some(task)) = Task::set_status(
                                &state_clone.db,
                                &task_id,
                                TaskStatus::Todo,
                            ).await {
                                state_clone.broadcast(WsMessage::TaskUpdated { task }).await;
                            }

                            state_clone.remove_running_task(&task_id).await;
                            break;
                        }
                    }
                }

                let _ = state_for_wait.remove_running_task(&task_id_for_wait).await;
            }
            Err(e) => {
                tracing::error!("Failed to spawn executor: {}", e);

                if let Ok(Some(task)) = Task::set_error(
                    &state_clone.db,
                    &task_id,
                    e.to_string(),
                ).await {
                    state_clone.broadcast(WsMessage::TaskUpdated { task }).await;
                }

                state_clone.broadcast(WsMessage::ExecutionComplete {
                    task_id: task_id.clone(),
                    success: false,
                }).await;

                state_clone.remove_running_task(&task_id).await;
            }
        }
    });

    Ok(Json(TaskResponse { task: updated }))
}

async fn cancel_task(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<TaskResponse>, (StatusCode, Json<ErrorResponse>)> {
    let running_task = state.remove_running_task(&id).await;

    match running_task {
        Some(rt) => {
            let _ = rt.cancel_tx.send(()).await;

            let task = Task::set_status(&state.db, &id, TaskStatus::Todo)
                .await
                .map_err(|e| {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ErrorResponse {
                            error: e.to_string(),
                        }),
                    )
                })?
                .ok_or_else(|| {
                    (
                        StatusCode::NOT_FOUND,
                        Json(ErrorResponse {
                            error: "Task not found".to_string(),
                        }),
                    )
                })?;

            state.broadcast(WsMessage::TaskUpdated { task: task.clone() }).await;

            Ok(Json(TaskResponse { task }))
        }
        None => Err((
            StatusCode::CONFLICT,
            Json(ErrorResponse {
                error: "Task is not running".to_string(),
            }),
        )),
    }
}

async fn complete_task(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<TaskResponse>, (StatusCode, Json<ErrorResponse>)> {
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

    // Validate task is in review status
    if task.status != TaskStatus::Review {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Task must be in review status to complete".to_string(),
            }),
        ));
    }

    // Get branch name
    let branch_name = match &task.branch_name {
        Some(name) => name.clone(),
        None => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Task has no branch to merge".to_string(),
                }),
            ))
        }
    };

    // Stop any running preview for this task
    let _ = state.remove_preview(&id).await;

    // Get worktree path for cleanup
    let worktree_path = task.worktree_path.clone();

    // Merge branch to main
    if let Err(e) = state.worktree_manager.merge_branch(&branch_name).await {
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to merge branch: {}", e),
            }),
        ));
    }

    // Remove worktree if it exists
    if let Some(ref wt_path) = worktree_path {
        let path = std::path::PathBuf::from(wt_path);
        if let Err(e) = state.worktree_manager.remove_worktree(&path).await {
            tracing::warn!("Failed to remove worktree: {}", e);
        }
    }

    // Delete the branch
    if let Err(e) = state.worktree_manager.delete_branch(&branch_name).await {
        tracing::warn!("Failed to delete branch: {}", e);
    }

    // Update status to Done
    let updated = Task::update(
        &state.db,
        &id,
        UpdateTask {
            title: None,
            description: None,
            status: Some(TaskStatus::Done),
            error_message: None,
            branch_name: None,
            worktree_path: None,
        },
    )
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: e.to_string(),
            }),
        )
    })?
    .ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Task not found".to_string(),
            }),
        )
    })?;

    state.broadcast(WsMessage::TaskUpdated { task: updated.clone() }).await;

    tracing::info!("Task {} completed: merged {} to main", id, branch_name);

    Ok(Json(TaskResponse { task: updated }))
}

#[derive(Serialize)]
struct MergeResponse {
    success: bool,
    message: String,
    merge_commit: Option<String>,
    #[serde(flatten)]
    task: Task,
}

async fn merge_task(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<MergeResponse>, (StatusCode, Json<ErrorResponse>)> {
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

    // Validate task is in review status
    if task.status != TaskStatus::Review {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Task must be in review status to merge".to_string(),
            }),
        ));
    }

    // Get branch name
    let branch_name = match &task.branch_name {
        Some(name) => name.clone(),
        None => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Task has no branch to merge".to_string(),
                }),
            ))
        }
    };

    // Broadcast merge started
    state.broadcast(WsMessage::MergeStarted {
        task_id: id.clone(),
    }).await;

    // Stop any running preview for this task
    let _ = state.remove_preview(&id).await;

    // Get worktree path for cleanup
    let worktree_path = task.worktree_path.clone();

    // Broadcast progress
    state.broadcast(WsMessage::MergeProgress {
        task_id: id.clone(),
        status: "Merging branch to main...".to_string(),
    }).await;

    // Merge branch to main
    if let Err(e) = state.worktree_manager.merge_branch(&branch_name).await {
        state.broadcast(WsMessage::MergeFailed {
            task_id: id.clone(),
            error: format!("Failed to merge branch: {}", e),
        }).await;

        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to merge branch: {}", e),
            }),
        ));
    }

    // Get the merge commit hash
    let merge_commit = state.worktree_manager
        .get_head_commit()
        .await
        .ok()
        .map(|s| s[..7].to_string()); // Short hash

    // Broadcast progress
    state.broadcast(WsMessage::MergeProgress {
        task_id: id.clone(),
        status: "Cleaning up worktree...".to_string(),
    }).await;

    // Remove worktree if it exists
    if let Some(ref wt_path) = worktree_path {
        let path = std::path::PathBuf::from(wt_path);
        if let Err(e) = state.worktree_manager.remove_worktree(&path).await {
            tracing::warn!("Failed to remove worktree: {}", e);
        }
    }

    // Delete the branch
    if let Err(e) = state.worktree_manager.delete_branch(&branch_name).await {
        tracing::warn!("Failed to delete branch: {}", e);
    }

    // Update status to Done
    let updated = Task::update(
        &state.db,
        &id,
        UpdateTask {
            title: None,
            description: None,
            status: Some(TaskStatus::Done),
            error_message: None,
            branch_name: None,
            worktree_path: None,
        },
    )
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: e.to_string(),
            }),
        )
    })?
    .ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Task not found".to_string(),
            }),
        )
    })?;

    // Build success message
    let message = match &merge_commit {
        Some(hash) => format!("{} merged to main ({})", branch_name, hash),
        None => format!("{} merged to main", branch_name),
    };

    // Broadcast completion
    state.broadcast(WsMessage::MergeComplete {
        task_id: id.clone(),
        commit: merge_commit.clone().unwrap_or_default(),
        message: message.clone(),
    }).await;

    state.broadcast(WsMessage::TaskUpdated { task: updated.clone() }).await;

    tracing::info!("Task {} merged: {} to main", id, branch_name);

    // Trigger rebuild in background
    let state_for_rebuild = state.clone();
    tokio::spawn(async move {
        trigger_rebuild(state_for_rebuild).await;
    });

    Ok(Json(MergeResponse {
        success: true,
        message,
        merge_commit,
        task: updated,
    }))
}

async fn trigger_rebuild(state: Arc<AppState>) {
    // Only rebuild if this is the eval-kanban project itself
    let cargo_toml = state.working_dir.join("Cargo.toml");
    if !cargo_toml.exists() {
        tracing::debug!("Skipping rebuild: not a Cargo project");
        return;
    }

    // Check if this is specifically eval-kanban (has the server crate)
    let server_crate = state.working_dir.join("crates/server/Cargo.toml");
    if !server_crate.exists() {
        tracing::debug!("Skipping rebuild: not the eval-kanban project");
        return;
    }

    tracing::info!("Starting server rebuild after merge");

    // Broadcast rebuild started
    state.broadcast(WsMessage::RebuildStarted).await;

    state.broadcast(WsMessage::RebuildProgress {
        message: "Running cargo build...".to_string(),
    }).await;

    // Run cargo build
    let output = tokio::process::Command::new("cargo")
        .args(["build", "-p", "eval-kanban-server"])
        .current_dir(&state.working_dir)
        .output()
        .await;

    match output {
        Ok(out) if out.status.success() => {
            tracing::info!("Server rebuild completed successfully");
            state.broadcast(WsMessage::RebuildComplete).await;
        }
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr);
            tracing::error!("Server rebuild failed: {}", stderr);
            state.broadcast(WsMessage::RebuildFailed {
                error: stderr.to_string(),
            }).await;
        }
        Err(e) => {
            tracing::error!("Failed to spawn cargo build: {}", e);
            state.broadcast(WsMessage::RebuildFailed {
                error: e.to_string(),
            }).await;
        }
    }
}
