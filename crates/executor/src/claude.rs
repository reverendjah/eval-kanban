use std::path::PathBuf;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::mpsc;

#[derive(Debug, thiserror::Error)]
pub enum ExecutorError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Claude Code not found. Please install it: npm install -g @anthropic-ai/claude-code")]
    ClaudeNotFound,
    #[error("Process error: {0}")]
    Process(String),
    #[error("Channel closed")]
    ChannelClosed,
}

#[derive(Debug, Clone)]
pub enum ExecutorEvent {
    Stdout(String),
    Stderr(String),
    Started,
    Completed { success: bool },
    Error(String),
}

pub struct ClaudeExecutor {
    working_dir: PathBuf,
}

impl ClaudeExecutor {
    pub fn new(working_dir: PathBuf) -> Self {
        Self { working_dir }
    }

    pub async fn check_claude_installed() -> bool {
        let result = if cfg!(windows) {
            Command::new("cmd")
                .args(["/C", "claude", "--version"])
                .output()
                .await
        } else {
            Command::new("claude")
                .arg("--version")
                .output()
                .await
        };

        result.map(|o| o.status.success()).unwrap_or(false)
    }

    pub async fn spawn(
        &self,
        prompt: &str,
    ) -> Result<(mpsc::Receiver<ExecutorEvent>, ClaudeProcess), ExecutorError> {
        let (tx, rx) = mpsc::channel(100);

        let mut cmd = if cfg!(windows) {
            let mut c = Command::new("cmd");
            c.args(["/C", "claude"]);
            c
        } else {
            Command::new("claude")
        };

        cmd.args([
            "--print",
            "--output-format", "stream-json",
            "--verbose",
            "--dangerously-skip-permissions",
        ])
        .arg(prompt)
        .current_dir(&self.working_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);

        let mut child = cmd.spawn().map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                ExecutorError::ClaudeNotFound
            } else {
                ExecutorError::Io(e)
            }
        })?;

        let stdout = child.stdout.take().ok_or_else(|| {
            ExecutorError::Process("Failed to capture stdout".to_string())
        })?;

        let stderr = child.stderr.take().ok_or_else(|| {
            ExecutorError::Process("Failed to capture stderr".to_string())
        })?;

        let tx_stdout = tx.clone();
        let stdout_reader = BufReader::new(stdout);
        tokio::spawn(async move {
            let mut lines = stdout_reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if tx_stdout.send(ExecutorEvent::Stdout(line)).await.is_err() {
                    break;
                }
            }
        });

        let tx_stderr = tx.clone();
        let stderr_reader = BufReader::new(stderr);
        tokio::spawn(async move {
            let mut lines = stderr_reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if tx_stderr.send(ExecutorEvent::Stderr(line)).await.is_err() {
                    break;
                }
            }
        });

        let _ = tx.send(ExecutorEvent::Started).await;

        let process = ClaudeProcess { child, tx };

        Ok((rx, process))
    }
}

pub struct ClaudeProcess {
    child: Child,
    tx: mpsc::Sender<ExecutorEvent>,
}

impl ClaudeProcess {
    pub async fn wait(mut self) -> Result<bool, ExecutorError> {
        let status = self.child.wait().await?;
        let success = status.success();

        let _ = self.tx.send(ExecutorEvent::Completed { success }).await;

        Ok(success)
    }

    pub async fn kill(mut self) -> Result<(), ExecutorError> {
        self.child.kill().await?;
        let _ = self.tx.send(ExecutorEvent::Completed { success: false }).await;
        Ok(())
    }

    pub fn try_kill(&mut self) -> Result<(), ExecutorError> {
        self.child.start_kill()?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_executor_creation() {
        let executor = ClaudeExecutor::new(PathBuf::from("/tmp"));
        assert_eq!(executor.working_dir, PathBuf::from("/tmp"));
    }

    #[test]
    fn test_executor_event_debug() {
        let event = ExecutorEvent::Stdout("test".to_string());
        assert!(format!("{:?}", event).contains("Stdout"));
    }
}
