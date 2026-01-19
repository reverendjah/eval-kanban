# eval-kanban - Claude Code Project

## Autonomia
FAZER, nao perguntar. BUSCAR, nao pedir contexto.

## Workflows
| Trigger | Acao |
|---------|------|
| criar/adicionar/implementar feature | `/feature` |
| bug/erro/problema | `/debug` |

---

## AVISO CRITICO: Dados do Usuario

O diretorio `~/.eval-kanban/` contem dados criticos:

```
~/.eval-kanban/
├── db.sqlite      # BANCO DE DADOS - TODAS AS TASKS DO USUARIO
├── worktrees/     # Git worktrees das tasks em execucao
└── bin/           # Cache dos binarios (seguro apagar)
```

### NUNCA FAZER:
```bash
rm -rf ~/.eval-kanban    # PERDA TOTAL DE DADOS!
```

### Comando CORRETO para limpar cache:
```bash
rm -rf ~/.eval-kanban/bin    # Apenas cache, dados preservados
```

---

## Arquitetura

### Stack
- **Backend:** Rust + Axum + SQLite + tokio
- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Comunicacao:** REST API + WebSocket (real-time)

### Estrutura do Projeto
```
evalUI/
├── crates/
│   ├── db/          # SQLite models, migrations, Task CRUD
│   ├── executor/    # Claude CLI integration, process management
│   ├── server/      # Axum HTTP server, WebSocket, routes
│   └── worktree/    # Git worktree management, branch isolation
├── frontend/
│   ├── src/
│   │   ├── components/  # React components (Kanban, TaskCard, etc)
│   │   ├── hooks/       # Custom hooks (useTasks, useWebSocket, etc)
│   │   ├── lib/         # API client, utilities
│   │   └── types/       # TypeScript types (Task, Plan, Review)
│   └── e2e/         # Playwright E2E tests
└── .claude/         # Project config and docs
```

### Fluxo de Dados
```
User -> Frontend -> REST API -> Backend -> SQLite
                 <- WebSocket <- (real-time updates)

Task Execution:
Frontend -> POST /tasks/:id/start
         -> Backend creates worktree
         -> Spawns Claude CLI in worktree
         -> Streams logs via WebSocket
         -> Task status updates in real-time
```

---

## Features Implementadas

### Core Kanban
- Criar/editar/deletar tasks
- Drag-and-drop entre colunas
- Status flow: Todo -> In Progress -> Review -> Done

### Execucao de Tasks
- Integracao com Claude CLI (`claude --dangerously-skip-permissions`)
- Worktree isolation por task (branch `ek/task-name-id`)
- Streaming de logs via WebSocket
- Cancel task em andamento

### Plan Mode
- Workflow interativo de planejamento
- Q&A com Claude antes de executar
- Summary do plano gerado
- Pode executar ou refazer o plano

### Review & Merge
- Diff viewer integrado (git diff)
- Preview server (frontend dev + backend)
- Merge para main com cleanup automatico
- Delete branch e worktree apos merge

### Auto-Rebuild
- Rebuild automatico apos merge (`cargo build`)
- Banner de status no frontend
- Botao "Restart Now" para aplicar mudancas

---

## API Endpoints

### Tasks
| Method | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/tasks` | Listar todas as tasks |
| POST | `/api/tasks` | Criar nova task |
| PATCH | `/api/tasks/:id` | Atualizar task |
| DELETE | `/api/tasks/:id` | Deletar task |
| POST | `/api/tasks/:id/start` | Iniciar execucao |
| POST | `/api/tasks/:id/cancel` | Cancelar execucao |
| POST | `/api/tasks/:id/merge` | Merge para main |

### Plan Mode
| Method | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/api/plan` | Iniciar sessao de plan |
| GET | `/api/plan/:id` | Status da sessao |
| POST | `/api/plan/:id/answer` | Responder perguntas |
| POST | `/api/plan/:id/execute` | Executar plano |

### Review
| Method | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/tasks/:id/diff` | Obter diff da task |
| POST | `/api/tasks/:id/preview` | Iniciar preview |
| DELETE | `/api/tasks/:id/preview` | Parar preview |

### Server
| Method | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/api/server/restart` | Reiniciar servidor |

---

## WebSocket Events

### Task Events
- `task_updated` - Task foi criada/atualizada
- `task_deleted` - Task foi deletada
- `log` - Output do Claude CLI (stdout/stderr)
- `execution_complete` - Execucao terminou

### Merge Events
- `merge_started` - Merge iniciado
- `merge_progress` - Progresso do merge
- `merge_complete` - Merge bem-sucedido
- `merge_failed` - Merge falhou

### Rebuild Events
- `rebuild_started` - Build iniciado
- `rebuild_progress` - Progresso do build
- `rebuild_complete` - Build terminou
- `rebuild_failed` - Build falhou

### Plan Mode Events
- `plan_questions` - Claude enviou perguntas
- `plan_summary` - Resumo do plano gerado
- `plan_output` - Output do Claude
- `plan_error` - Erro no plan mode

---

## Comandos de Desenvolvimento

### Servidor Backend
```bash
cargo run -p eval-kanban-server
```

### Frontend (dev mode)
```bash
cd frontend && npm run dev
```

### Testes Unitarios
```bash
cd frontend && npm test -- --run
```

### Testes E2E (Playwright)
```bash
cd frontend && npm run test:e2e
# Debug visual:
cd frontend && npm run test:e2e:headed
```

### Build Producao
```bash
cargo build -p eval-kanban-server --release
cd frontend && npm run build
```

### Type Check
```bash
cd frontend && npx tsc --noEmit
```

---

## Codigo

### Regras Gerais
- Funcoes < 50 linhas, max 2 niveis nesting
- TypeScript strict, ES modules, async/await
- Zod para validacao de inputs externos
- PROIBIDO: `any`, try/catch generico, callbacks

### Testes (BLOQUEANTE)
Codigo sem teste = PR rejeitado.
Excecoes: config files, .d.ts, UI puro sem logica.

### Fluxos E2E Cobertos
- Criar/deletar tasks
- Validacao de formularios
- Conexao WebSocket
- Drag-and-drop entre colunas

---

## Memory (MCP)

Namespace: `evalUI`
Sincronizar via `memory-sync` ao final de workflows.

---

## Auto-Avaliacao

Apos `/feature` e `/debug`: executar fase de avaliacao.
Dual-loop sequential thinking: diagnostico -> sintese -> propor melhorias.
