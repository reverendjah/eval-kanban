# Spec: eval-kanban Fase 1 (MVP)

**Status:** Draft
**Data:** 2025-01-16

## Problema

Desenvolvedores precisam de uma forma visual de gerenciar tarefas executadas pelo Claude Code, com interface web que permita criar tarefas, acompanhar execucao em tempo real e ver resultados.

## Solucao

Ferramenta CLI (`npx eval-kanban`) que abre um Kanban board web para orquestrar tarefas do Claude Code, com streaming de output em tempo real.

## Escopo

### Inclui (Fase 1)
- NPX CLI que inicia servidor Rust
- Kanban board com 4 colunas (To Do, In Progress, Review, Done)
- Criar tarefa (titulo + descricao)
- Drag-and-drop entre colunas
- Spawn Claude Code CLI para executar tarefa
- Stream stdout/stderr em tempo real via WebSocket
- Persistencia de tarefas em SQLite
- Abrir browser automaticamente

### Nao Inclui (Fases futuras)
- Git worktrees (isolamento por tarefa)
- Aprovacoes interativas de tool calls
- Review com diff visual
- Retry com feedback
- Merge integrado
- Binarios pre-compilados para distribuicao
- Multiplas tarefas paralelas

## Design Tecnico

### Estrutura de Diretorios

```
eval-kanban/
├── Cargo.toml                    # Workspace
├── crates/
│   ├── server/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── main.rs           # Entry point, server setup
│   │       ├── routes/
│   │       │   ├── mod.rs
│   │       │   ├── tasks.rs      # CRUD endpoints
│   │       │   └── ws.rs         # WebSocket handler
│   │       └── state.rs          # AppState
│   ├── db/
│   │   ├── Cargo.toml
│   │   ├── migrations/
│   │   │   └── 001_create_tasks.sql
│   │   └── src/
│   │       ├── lib.rs            # DB setup
│   │       └── models/
│   │           ├── mod.rs
│   │           └── task.rs       # Task model
│   └── executor/
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs
│           └── claude.rs         # Claude Code spawner
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── KanbanBoard.tsx
│       │   ├── KanbanColumn.tsx
│       │   ├── TaskCard.tsx
│       │   ├── CreateTaskModal.tsx
│       │   └── LogPanel.tsx
│       ├── hooks/
│       │   ├── useTasks.ts
│       │   └── useWebSocket.ts
│       ├── types/
│       │   └── task.ts
│       └── lib/
│           └── api.ts
└── npx-cli/
    ├── package.json
    └── bin/
        └── cli.js
```

### Dados

#### Tabela: tasks

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | TEXT (UUID) | Primary key |
| title | TEXT | Titulo da tarefa |
| description | TEXT | Descricao/prompt para Claude |
| status | TEXT | 'todo', 'in_progress', 'review', 'done' |
| error_message | TEXT NULL | Mensagem de erro se falhou |
| created_at | DATETIME | Timestamp criacao |
| updated_at | DATETIME | Timestamp ultima atualizacao |

#### Migration 001_create_tasks.sql

```sql
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    error_message TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
```

### API Endpoints

| Method | Path | Request | Response | Descricao |
|--------|------|---------|----------|-----------|
| GET | /api/tasks | - | Task[] | Listar todas as tarefas |
| POST | /api/tasks | { title, description } | Task | Criar nova tarefa |
| PATCH | /api/tasks/:id | { status?, title?, description? } | Task | Atualizar tarefa |
| DELETE | /api/tasks/:id | - | 204 | Deletar tarefa |
| POST | /api/tasks/:id/start | - | Task | Iniciar execucao |
| POST | /api/tasks/:id/cancel | - | Task | Cancelar execucao |

#### WebSocket: /ws

**Client -> Server:**
```json
{ "type": "subscribe", "task_id": "uuid" }
{ "type": "unsubscribe", "task_id": "uuid" }
```

**Server -> Client:**
```json
{ "type": "task_updated", "task": Task }
{ "type": "log", "task_id": "uuid", "content": "string", "stream": "stdout"|"stderr" }
{ "type": "execution_complete", "task_id": "uuid", "success": boolean }
```

### Types (TypeScript)

```typescript
// types/task.ts
import { z } from 'zod';

export const TaskStatus = z.enum(['todo', 'in_progress', 'review', 'done']);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  status: TaskStatus,
  error_message: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Titulo obrigatorio'),
  description: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
```

### Tratamento de Erros

| Cenario | Comportamento |
|---------|---------------|
| Tarefa nao encontrada | 404 Not Found |
| Validacao falhou | 400 Bad Request com detalhes |
| Claude Code nao instalado | Erro com instrucoes de instalacao |
| Execucao falhou | Status 'review', error_message preenchido |
| WebSocket desconectou | Reconectar automaticamente |

### Reutilizacao do Vibe Kanban

| Existente | Uso |
|-----------|-----|
| `vibe-kanban-ref/crates/db/src/lib.rs` | Pattern de SQLite setup |
| `vibe-kanban-ref/crates/server/src/main.rs` | Pattern de Axum server |
| `vibe-kanban-ref/crates/executors/src/executors/claude.rs` | Pattern de Claude spawn |
| `vibe-kanban-ref/npx-cli/bin/cli.js` | Pattern de CLI wrapper |

### Justificativa para Codigo Novo

| Novo Codigo | Por que nao reutilizar existente? |
|-------------|-----------------------------------|
| Frontend inteiro | Vibe Kanban e muito complexo, MVP precisa ser simples |
| Schema SQLite | Diferente do Vibe Kanban, mais simples |
| API endpoints | Subset simplificado |

## UI/UX

### Fluxo Principal

1. User roda `npx eval-kanban` no terminal
2. Browser abre em http://localhost:9847
3. User ve Kanban board vazio
4. User clica "New Task"
5. Modal abre, user preenche titulo e descricao
6. User clica "Create"
7. Task aparece em "To Do"
8. User arrasta task para "In Progress" (ou clica "Start")
9. Claude Code comeca a executar
10. LogPanel mostra output em tempo real
11. Quando termina: task vai para "Review" (sucesso) ou fica com status erro
12. User arrasta para "Done" quando satisfeito

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  eval-kanban                                        [+ New Task]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                │
│  │ To Do   │  │In Prog. │  │ Review  │  │  Done   │                │
│  │         │  │         │  │         │  │         │                │
│  │ ┌─────┐ │  │ ┌─────┐ │  │         │  │         │                │
│  │ │Task1│ │  │ │Task2│ │  │         │  │         │                │
│  │ └─────┘ │  │ └─────┘ │  │         │  │         │                │
│  │         │  │         │  │         │  │         │                │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘                │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Logs (Task2)                                            [Clear]    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ > Reading file src/App.tsx...                                │   │
│  │ > Editing file src/App.tsx...                                │   │
│  │ > Running npm test...                                        │   │
│  │ █                                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Estados

| Estado | Display |
|--------|---------|
| Loading | Spinner no board |
| Empty | "No tasks yet. Create one!" |
| Error (API) | Toast com mensagem |
| Task running | Spinner no card, logs ativos |
| Task failed | Card vermelho, error_message visivel |

### Drag & Drop

- Livre entre: To Do ↔ Review ↔ Done
- Restrito: Nao pode mover de "In Progress" (controlado pelo sistema)
- Ao mover para "In Progress": Dispara execucao automaticamente

## Edge Cases

| Caso | Tratamento |
|------|------------|
| Claude Code nao instalado | Mostrar erro com link para instalacao |
| Tarefa sem descricao | Usar titulo como prompt |
| Mover task em execucao | Bloquear drag, mostrar tooltip |
| Fechar browser durante execucao | Processo continua, reconecta mostra estado |
| Porta 9847 em uso | Tentar proxima porta (9848, etc) |
| WebSocket desconecta | Reconectar com exponential backoff |

## Testes

### Unitarios (OBRIGATORIO)

| Funcao/Modulo | Arquivo Teste | Casos |
|---------------|---------------|-------|
| Task CRUD (Rust) | `crates/db/src/models/task.rs` | create, read, update, delete |
| Task validation (TS) | `frontend/src/types/task.test.ts` | schema validation |
| API client (TS) | `frontend/src/lib/api.test.ts` | fetch, error handling |

### Integração (Fase 2+)

- API endpoints E2E
- WebSocket communication
- Claude Code spawn

## Decisoes

| Decisao | Justificativa |
|---------|---------------|
| SQLite vs PostgreSQL | Zero config, suficiente para local |
| Axum vs Actix | Mais moderno, tokio-native |
| @hello-pangea/dnd vs dnd-kit | Especifico para Kanban, menos config |
| TanStack Query | Cache + refetch automatico |
| Dev mode (cargo run) | Simplifica Fase 1, binarios depois |
| Porta 9847 | Nao conflita com portas comuns |

## Dependencias

### Rust (Cargo.toml)

```toml
[workspace]
members = ["crates/*"]
resolver = "2"

[workspace.dependencies]
tokio = { version = "1", features = ["full"] }
axum = { version = "0.7", features = ["ws"] }
sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4", "serde"] }
thiserror = "1"
tracing = "0.1"
tracing-subscriber = "0.3"
tower-http = { version = "0.5", features = ["cors", "fs"] }
```

### Frontend (package.json)

```json
{
  "dependencies": {
    "react": "^18.3",
    "react-dom": "^18.3",
    "@hello-pangea/dnd": "^16.6",
    "@tanstack/react-query": "^5.60",
    "zod": "^3.23",
    "clsx": "^2.1"
  },
  "devDependencies": {
    "vite": "^5.4",
    "@vitejs/plugin-react": "^4.3",
    "typescript": "^5.6",
    "tailwindcss": "^3.4",
    "postcss": "^8.4",
    "autoprefixer": "^10.4",
    "@types/react": "^18.3",
    "@types/react-dom": "^18.3",
    "vitest": "^2.1"
  }
}
```

---

*Spec gerada em: 2025-01-16*
*Proxima fase: Planner*
