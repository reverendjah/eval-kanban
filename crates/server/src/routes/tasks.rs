use std::sync::Arc;
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::{delete, get, patch, post},
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
}

async fn list_tasks(
    State(state): State<Arc<AppState>>,
) -> Result<Json<TasksResponse>, (StatusCode, Json<ErrorResponse>)> {
    let tasks = Task::find_all(&state.db).await.map_err(|e| {
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

    let task = Task::create(
        &state.db,
        CreateTask {
            title: req.title,
            description: req.description,
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
        match state.worktree_manager.create_worktree(&task.title).await {
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
                                    let status = if success {
                                        TaskStatus::Review
                                    } else {
                                        TaskStatus::Review
                                    };

                                    if let Ok(Some(task)) = Task::set_status(
                                        &state_clone.db,
                                        &task_id,
                                        status,
                                    ).await {
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
