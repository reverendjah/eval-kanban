# eval-kanban

Kanban board for orchestrating tasks with Claude Code.

## Quick Start

```bash
npx eval-kanban
```

That's it! The server will start and open your browser automatically.

### Supported Platforms

| Platform | Status |
|----------|--------|
| Linux x64 | Supported |
| Windows x64 | Supported |
| macOS ARM64 (M1+) | Supported |
| macOS Intel | Not supported |
| Linux ARM64 | Not supported |

## Prerequisites

- **Node.js** (18+) - https://nodejs.org
- **Claude Code** - `npm install -g @anthropic-ai/claude-code`

For development only:
- **Rust** (1.70+) - https://rustup.rs

## Data Storage

All data is stored in `~/.eval-kanban/`:

```
~/.eval-kanban/
├── db.sqlite      # Task database (YOUR DATA!)
├── worktrees/     # Git worktrees for task execution
└── bin/           # Downloaded binaries (cache)
```

### Clearing Cache

To clear the binary cache (e.g., to force re-download):

```bash
rm -rf ~/.eval-kanban/bin
```

> **WARNING:** Do NOT delete the entire `~/.eval-kanban/` directory! This will permanently delete all your tasks. Only delete the `bin/` subdirectory if you need to clear the cache.

## Development Setup

### 1. Build Frontend

```bash
cd frontend
npm install
npm run build
```

### 2. Build and Run Server

```bash
cargo build --release -p eval-kanban-server
./target/release/eval-kanban-server
```

Or for development with auto-reload:

```bash
cargo run -p eval-kanban-server
```

### 3. Access the Application

Open http://localhost:9847 in your browser.

## Project Structure

```
eval-kanban/
├── crates/
│   ├── db/           # SQLite database layer
│   ├── executor/     # Claude Code process spawner
│   └── server/       # Axum HTTP server + WebSocket
├── frontend/         # React + Vite + Tailwind
└── npx-cli/          # NPX wrapper (for future distribution)
```

## Features

- Kanban board with 4 columns (To Do → In Progress → Review → Done)
- Drag-and-drop between columns
- Task execution with Claude Code
- Real-time log streaming via WebSocket
- Plan Mode - interactive planning with Q&A before execution
- Review Mode - diff viewer with merge to main
- Git worktree isolation per task
- Auto-rebuild after merge
- SQLite persistence

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/tasks | List all tasks |
| POST | /api/tasks | Create new task |
| PATCH | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |
| POST | /api/tasks/:id/start | Start task execution |
| POST | /api/tasks/:id/cancel | Cancel running task |
| WS | /api/ws | WebSocket for real-time updates |

## License

MIT
