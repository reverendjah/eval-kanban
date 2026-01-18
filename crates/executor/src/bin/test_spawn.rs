use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;
use std::time::Duration;

#[tokio::main]
async fn main() {
    println!("=== Claude CLI Spawn Diagnostic v4 ===\n");

    // Teste final: SEM --input-format, stdin NULL
    // Esta config funciona - vamos confirmar e planejar a arquitetura
    println!("=== Teste final: SEM --input-format, stdin NULL ===");
    test_spawn(false, StdinMode::Null, None).await;

    println!("\n=== Teste adicional: verificar se recebemos AskUserQuestion ===");
    test_spawn_with_question_detection().await;

    println!("\n=== Diagn\u{00f3}stico completo ===");
}

async fn test_spawn_with_question_detection() {
    let node = "C:\\Program Files\\nodejs\\node.exe";
    let cli = std::env::var("APPDATA")
        .map(|a| format!("{}\\npm\\node_modules\\@anthropic-ai\\claude-code\\cli.js", a))
        .unwrap_or_else(|_| {
            "C:\\Users\\caio\\AppData\\Roaming\\npm\\node_modules\\@anthropic-ai\\claude-code\\cli.js".to_string()
        });

    let args = vec![
        "--print",
        "--output-format", "stream-json",
        "--verbose",
        "--permission-mode", "plan",
    ];

    println!("Args: {:?}", args);
    println!("stdin: null");

    let mut cmd = Command::new(node);
    cmd.arg(&cli)
       .args(&args)
       .arg("Adicione autenticacao de usuario com login e logout neste projeto")
       .stdout(Stdio::piped())
       .stderr(Stdio::piped())
       .stdin(Stdio::null())
       .current_dir("C:\\Claude\\evalUI");

    let start = std::time::Instant::now();

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            println!("ERRO ao spawnar: {:?}", e);
            return;
        }
    };

    println!("PID: {:?}", child.id());

    let stdout = child.stdout.take().unwrap();
    let mut reader = BufReader::new(stdout).lines();
    let mut line_count = 0;
    let mut found_question = false;

    // Ler por ate 60 segundos procurando AskUserQuestion
    let result = tokio::time::timeout(Duration::from_secs(60), async {
        while let Ok(Some(line)) = reader.next_line().await {
            line_count += 1;

            // Verificar se tem um tool_use de AskUserQuestion (nao apenas na lista de tools)
            if line.contains("\"name\":\"AskUserQuestion\"") && line.contains("tool_use") {
                println!("[STDOUT #{}] ENCONTROU tool_use AskUserQuestion!", line_count);
                println!("Linha completa (truncada):\n{}...", &line[..line.len().min(500)]);
                found_question = true;
                break;
            }

            // Mostrar preview
            if line_count <= 10 || line_count % 10 == 0 {
                let preview = if line.len() > 80 {
                    format!("{}...", &line[..80])
                } else {
                    line.clone()
                };
                println!("[STDOUT #{}] {}", line_count, preview);
            }
        }
        (line_count, found_question)
    }).await;

    let elapsed = start.elapsed();
    let _ = child.kill().await;

    match result {
        Ok((count, found)) => {
            if found {
                println!("SUCESSO: Encontramos AskUserQuestion na linha {} ({:?})", count, elapsed);
            } else {
                println!("Recebemos {} linhas mas nao encontramos AskUserQuestion ({:?})", count, elapsed);
            }
        }
        Err(_) => {
            println!("TIMEOUT apos 60s ({} linhas recebidas)", line_count);
        }
    }
}

#[derive(Clone)]
enum StdinMode {
    Null,
    Piped,
    PipedClose,
    PipedDelayedClose,
    PipedSendThen(&'static str),
    Inherit,
}

async fn test_spawn(with_input_format: bool, stdin_mode: StdinMode, initial_msg: Option<&str>) {
    let node = "C:\\Program Files\\nodejs\\node.exe";
    let cli = std::env::var("APPDATA")
        .map(|a| format!("{}\\npm\\node_modules\\@anthropic-ai\\claude-code\\cli.js", a))
        .unwrap_or_else(|_| {
            "C:\\Users\\caio\\AppData\\Roaming\\npm\\node_modules\\@anthropic-ai\\claude-code\\cli.js".to_string()
        });

    let mut args = vec![
        "--print",
        "--output-format", "stream-json",
        "--verbose",
        "--permission-mode", "plan",
    ];

    if with_input_format {
        args.push("--input-format");
        args.push("stream-json");
    }

    let stdin_desc = match &stdin_mode {
        StdinMode::Null => "null".to_string(),
        StdinMode::Piped => "piped (open)".to_string(),
        StdinMode::PipedClose => "piped (close immediately)".to_string(),
        StdinMode::PipedDelayedClose => "piped (close after 100ms)".to_string(),
        StdinMode::PipedSendThen(s) => format!("piped (send {:?} then keep open)", s),
        StdinMode::Inherit => "inherit".to_string(),
    };
    println!("Args: {:?}", args);
    println!("stdin: {}", stdin_desc);

    let mut cmd = Command::new(node);
    cmd.arg(&cli)
       .args(&args)
       .arg("Adicione autenticacao de usuario com login e logout neste projeto")
       .stdout(Stdio::piped())
       .stderr(Stdio::piped())
       .current_dir("C:\\Claude\\evalUI");

    match &stdin_mode {
        StdinMode::Null => { cmd.stdin(Stdio::null()); }
        StdinMode::Inherit => { cmd.stdin(Stdio::inherit()); }
        _ => { cmd.stdin(Stdio::piped()); }
    }

    let start = std::time::Instant::now();

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            println!("ERRO ao spawnar: {:?}", e);
            return;
        }
    };

    println!("PID: {:?}", child.id());

    // Handle stdin based on mode
    match &stdin_mode {
        StdinMode::PipedClose => {
            if let Some(stdin) = child.stdin.take() {
                drop(stdin);
                println!("(stdin fechado imediatamente)");
            }
        }
        StdinMode::PipedDelayedClose => {
            if let Some(stdin) = child.stdin.take() {
                tokio::time::sleep(Duration::from_millis(100)).await;
                drop(stdin);
                println!("(stdin fechado apos 100ms)");
            }
        }
        StdinMode::PipedSendThen(msg) => {
            if let Some(mut stdin) = child.stdin.take() {
                println!("Enviando: {:?}", msg);
                let _ = stdin.write_all(msg.as_bytes()).await;
                let _ = stdin.flush().await;
                // Manter stdin aberto - spawn task para manter referencia
                tokio::spawn(async move {
                    tokio::time::sleep(Duration::from_secs(60)).await;
                    drop(stdin);
                });
                println!("(stdin mantido aberto)");
            }
        }
        _ => {}
    }

    // Send initial message if provided
    if let Some(msg) = initial_msg {
        if let Some(mut stdin) = child.stdin.take() {
            println!("Enviando mensagem inicial: {}", msg);
            let _ = stdin.write_all(msg.as_bytes()).await;
            let _ = stdin.write_all(b"\n").await;
            let _ = stdin.flush().await;
            child.stdin = Some(stdin);
        }
    }

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    // Spawn task para ler stderr
    let stderr_handle = tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        let mut count = 0;
        while let Ok(Some(line)) = reader.next_line().await {
            count += 1;
            if count <= 3 {
                println!("[STDERR] {}", &line[..line.len().min(80)]);
            }
        }
        count
    });

    // Ler stdout com timeout
    let mut reader = BufReader::new(stdout).lines();
    let mut line_count = 0;

    let result = tokio::time::timeout(Duration::from_secs(15), async {
        while let Ok(Some(line)) = reader.next_line().await {
            line_count += 1;
            let preview = if line.len() > 100 {
                format!("{}...", &line[..100])
            } else {
                line.clone()
            };
            println!("[STDOUT #{}] {}", line_count, preview);

            // Se recebemos 5 linhas, assumimos que funciona
            if line_count >= 5 {
                break;
            }
        }
        line_count
    }).await;

    let elapsed = start.elapsed();

    // Matar o processo
    let _ = child.kill().await;

    match result {
        Ok(count) => {
            if count > 0 {
                println!("SUCESSO: Recebemos {} linhas em {:?}", count, elapsed);
            } else {
                println!("FALHOU: 0 linhas em {:?}", elapsed);
            }
        }
        Err(_) => {
            println!("TIMEOUT: Nenhum output em 15s");
        }
    }

    // Verificar stderr
    if let Ok(stderr_count) = stderr_handle.await {
        if stderr_count > 0 {
            println!("(stderr teve {} linhas)", stderr_count);
        }
    }
}
