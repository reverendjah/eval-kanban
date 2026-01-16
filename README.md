# eval-kanban

Kanban board for orchestrating tasks with Claude Code.

## Prerequisites

- **Rust** (1.70+) - https://rustup.rs
- **Node.js** (18+) - https://nodejs.org
- **Claude Code** - `npm install -g @anthropic-ai/claude-code`

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

## Features (MVP - Phase 1)

- [x] Kanban board with 4 columns (To Do, In Progress, Review, Done)
- [x] Create tasks with title and description
- [x] Drag-and-drop between columns
- [x] Start task execution with Claude Code
- [x] Real-time log streaming via WebSocket
- [x] SQLite persistence
- [x] Auto-open browser on startup

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

## Configuration

Data is stored in `~/.eval-kanban/`:
- `db.sqlite` - Task database

## License

MIT
