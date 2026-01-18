use std::sync::Arc;
use axum::{
    extract::{
        State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::IntoResponse,
};
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use eval_kanban_db::Task;

use crate::state::AppState;
use crate::plan_session::PlanQuestion;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WsMessage {
    TaskUpdated { task: Task },
    TaskDeleted { task_id: String },
    Log {
        task_id: String,
        content: String,
        stream: String,
    },
    ExecutionComplete {
        task_id: String,
        success: bool,
    },
    MergeStarted {
        task_id: String,
    },
    MergeProgress {
        task_id: String,
        status: String,
    },
    MergeComplete {
        task_id: String,
        commit: String,
        message: String,
    },
    MergeFailed {
        task_id: String,
        error: String,
    },
    PlanQuestions {
        session_id: String,
        questions: Vec<PlanQuestion>,
    },
    PlanSummary {
        session_id: String,
        summary: String,
    },
    PlanError {
        session_id: String,
        error: String,
    },
    PlanOutput {
        session_id: String,
        content: String,
    },
    RebuildStarted,
    RebuildProgress {
        message: String,
    },
    RebuildComplete,
    RebuildFailed {
        error: String,
    },
    Ping,
    Pong,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientMessage {
    Subscribe { task_id: String },
    Unsubscribe { task_id: String },
    Ping,
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    tracing::info!("[WebSocket] New client connected");
    let (mut sender, mut receiver) = socket.split();
    let mut broadcast_rx = state.ws_broadcast.subscribe();

    let send_task = tokio::spawn(async move {
        while let Ok(msg) = broadcast_rx.recv().await {
            // Log plan-related messages for debugging
            match &msg {
                WsMessage::PlanQuestions { session_id, questions } => {
                    tracing::info!("[WebSocket] Sending PlanQuestions ({} questions) for session {}", questions.len(), &session_id[..8.min(session_id.len())]);
                }
                WsMessage::PlanSummary { session_id, .. } => {
                    tracing::info!("[WebSocket] Sending PlanSummary for session {}", &session_id[..8.min(session_id.len())]);
                }
                WsMessage::PlanError { session_id, error } => {
                    tracing::warn!("[WebSocket] Sending PlanError for session {}: {}", &session_id[..8.min(session_id.len())], error);
                }
                WsMessage::PlanOutput { session_id, .. } => {
                    tracing::debug!("[WebSocket] Sending PlanOutput for session {}", &session_id[..8.min(session_id.len())]);
                }
                _ => {}
            }

            let json = match serde_json::to_string(&msg) {
                Ok(j) => j,
                Err(e) => {
                    tracing::error!("[WebSocket] Failed to serialize message: {}", e);
                    continue;
                }
            };

            if sender.send(Message::Text(json.into())).await.is_err() {
                tracing::warn!("[WebSocket] Failed to send message, client disconnected");
                break;
            }
        }
    });

    let receive_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                        match client_msg {
                            ClientMessage::Subscribe { task_id } => {
                                tracing::debug!("Client subscribed to task: {}", task_id);
                            }
                            ClientMessage::Unsubscribe { task_id } => {
                                tracing::debug!("Client unsubscribed from task: {}", task_id);
                            }
                            ClientMessage::Ping => {
                                tracing::debug!("Received ping");
                            }
                        }
                    }
                }
                Message::Close(_) => break,
                _ => {}
            }
        }
    });

    tokio::select! {
        _ = send_task => {}
        _ = receive_task => {}
    }

    tracing::info!("[WebSocket] Client disconnected");
}
