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
            // On Windows, call node directly with the CLI script
            // This ensures proper stdout capture (cmd.exe doesn't pipe correctly)
            let node_path = Self::get_node_path();
            let cli_path = Self::get_claude_cli_path();
            tracing::debug!("[Claude] Using node: {}, cli: {}", node_path, cli_path);
            Command::new(&node_path)
                .arg(&cli_path)
                .arg("--version")
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

    #[cfg(windows)]
    fn get_node_path() -> String {
        // Try common Node.js installation paths
        // Priority: Program Files, then nvm, then PATH
        let common_paths = [
            "C:\\Program Files\\nodejs\\node.exe",
            "C:\\Program Files (x86)\\nodejs\\node.exe",
        ];

        for path in &common_paths {
            if std::path::Path::new(path).exists() {
                return path.to_string();
            }
        }

        // Fallback to just "node" and hope it's in PATH
        "node".to_string()
    }

    #[cfg(windows)]
    fn get_claude_cli_path() -> String {
        // Get the path to Claude CLI from npm global installation
        // Default: %APPDATA%\npm\node_modules\@anthropic-ai\claude-code\cli.js
        if let Ok(appdata) = std::env::var("APPDATA") {
            format!("{}\\npm\\node_modules\\@anthropic-ai\\claude-code\\cli.js", appdata)
        } else {
            // Fallback to common path
            "C:\\Users\\caio\\AppData\\Roaming\\npm\\node_modules\\@anthropic-ai\\claude-code\\cli.js".to_string()
        }
    }

    pub async fn spawn(
        &self,
        prompt: &str,
    ) -> Result<(mpsc::Receiver<ExecutorEvent>, ClaudeProcess), ExecutorError> {
        let (rx, process, _stdin_tx) = self.spawn_internal(prompt, false).await?;
        Ok((rx, process))
    }

    /// Spawn Claude with interactive stdin support.
    /// Returns an mpsc::Sender that can be used to send input to Claude's stdin.
    pub async fn spawn_interactive(
        &self,
        prompt: &str,
    ) -> Result<(mpsc::Receiver<ExecutorEvent>, ClaudeProcess, mpsc::Sender<String>), ExecutorError> {
        self.spawn_internal(prompt, true).await
    }

    /// Run Claude in plan mode and capture all output synchronously.
    /// This is more reliable than spawn_interactive for capturing stdout on Windows.
    /// Returns the raw stdout output as a string.
    pub async fn run_plan_mode(&self, prompt: &str) -> Result<String, ExecutorError> {
        // On Windows, call node directly with the CLI script using full paths
        // This ensures proper stdout capture (cmd.exe doesn't pipe correctly)
        let mut cmd = if cfg!(windows) {
            let node_path = Self::get_node_path();
            let cli_path = Self::get_claude_cli_path();
            tracing::info!("[Claude Plan] Using node: {}, cli: {}", node_path, cli_path);
            let mut c = Command::new(&node_path);
            c.arg(&cli_path);
            c
        } else {
            Command::new("claude")
        };

        // Use stream-json for structured output parsing
        let args = [
            "--print",
            "--output-format", "stream-json",
            "--verbose",
            "--permission-mode", "plan",
        ];

        tracing::info!(
            "[Claude Plan] Running with args: {:?}, prompt length: {}, working_dir: {:?}",
            args,
            prompt.len(),
            &self.working_dir
        );
        tracing::debug!("[Claude Plan] Full prompt: {}", prompt);

        let output = cmd
            .args(&args)
            .arg(prompt)
            .current_dir(&self.working_dir)
            .output()
            .await
            .map_err(|e| {
                tracing::error!("[Claude Plan] Failed to execute: {:?}", e);
                if e.kind() == std::io::ErrorKind::NotFound {
                    ExecutorError::ClaudeNotFound
                } else {
                    ExecutorError::Io(e)
                }
            })?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        tracing::info!(
            "[Claude Plan] Completed: success={}, stdout_len={}, stderr_len={}",
            output.status.success(),
            stdout.len(),
            stderr.len()
        );

        if !stderr.is_empty() {
            tracing::warn!("[Claude Plan] Stderr: {}", stderr);
        }

        if !output.status.success() {
            tracing::error!("[Claude Plan] Process failed with status: {:?}", output.status);
            return Err(ExecutorError::Process(format!(
                "Claude exited with status: {:?}. Stderr: {}",
                output.status, stderr
            )));
        }

        Ok(stdout)
    }

    async fn spawn_internal(
        &self,
        prompt: &str,
        interactive: bool,
    ) -> Result<(mpsc::Receiver<ExecutorEvent>, ClaudeProcess, mpsc::Sender<String>), ExecutorError> {
        let (tx, rx) = mpsc::channel(100);
        // NOTE: stdin_rx is unused now that we use stdin null
        // Kept for API compatibility but will be replaced with re-spawn mechanism
        let (stdin_tx, _stdin_rx) = mpsc::channel::<String>(32);

        // On Windows, call node directly with the CLI script using full paths
        // This ensures proper stdout capture (cmd.exe doesn't pipe correctly)
        let mut cmd = if cfg!(windows) {
            let node_path = Self::get_node_path();
            let cli_path = Self::get_claude_cli_path();
            tracing::info!("[Claude] Using node: {}, cli: {}", node_path, cli_path);
            let mut c = Command::new(&node_path);
            c.arg(&cli_path);
            c
        } else {
            Command::new("claude")
        };

        // Build args based on mode
        // - Interactive (plan mode): needs stream-json for tool_use parsing
        //   NOTE: We use stdin null because piped stdin blocks the process on Windows
        //   Responses will be sent by re-spawning with context
        // - Non-interactive: use --dangerously-skip-permissions for autonomous execution
        let args: Vec<&str> = if interactive {
            vec![
                "--print",
                "--output-format", "stream-json",
                // NOTE: Removed --input-format stream-json - it requires stdin which blocks
                "--verbose",
                "--permission-mode", "plan",
            ]
        } else {
            vec!["--print", "--dangerously-skip-permissions"]
        };

        // CRITICAL: Always use Stdio::null() for stdin
        // When stdin is piped but empty, the Claude CLI blocks waiting for input
        // This was confirmed via diagnostic testing - only stdin null allows output
        cmd.args(&args)
        .arg(prompt)
        .current_dir(&self.working_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);

        // Log the command being executed
        tracing::info!(
            "[Claude] Spawning claude with args: {:?}, prompt length: {}, interactive: {}, working_dir: {:?}",
            args,
            prompt.len(),
            interactive,
            &self.working_dir
        );
        tracing::debug!("[Claude] Full prompt: {}", prompt);

        let mut child = cmd.spawn().map_err(|e| {
            tracing::error!("[Claude] Failed to spawn process: {:?}", e);
            if e.kind() == std::io::ErrorKind::NotFound {
                ExecutorError::ClaudeNotFound
            } else {
                ExecutorError::Io(e)
            }
        })?;

        tracing::info!("[Claude] Process spawned successfully, pid: {:?}", child.id());

        // NOTE: stdin writer removed - we now use stdin null to avoid blocking
        // Interactive responses will be handled by re-spawning with context
        // The stdin_tx channel is still returned for API compatibility but won't be used
        if interactive {
            tracing::info!("[Claude] Interactive mode enabled (stdin null, responses via re-spawn)");
        }

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

        Ok((rx, process, stdin_tx))
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
