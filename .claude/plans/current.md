# Plano: eval-kanban Fase 1 (MVP)

**Spec:** `.claude/specs/fase1-mvp-2025-01-16.md`
**Data:** 2025-01-16

---

## Analise Anti-Duplicacao

### Codigo Reutilizavel (Vibe Kanban)

| Necessidade | Codigo Existente | Acao |
|-------------|------------------|------|
| SQLite init | `vibe-kanban-ref/crates/db/src/lib.rs` | Adaptar (simplificar) |
| Asset paths | `vibe-kanban-ref/crates/utils/src/assets.rs` | Adaptar (mudar path) |
| Platform detection | `vibe-kanban-ref/npx-cli/bin/cli.js` | Adaptar (remover download) |

### Justificativa para Codigo Novo

| Arquivo | Justificativa |
|---------|---------------|
| Server routes | API completamente diferente, mais simples |
| Executor | So Claude, sem multi-agent |
| Frontend | UI nova, minimalista |
| Task model | Schema proprio |

---

## Breakdown de Tarefas

### Bloco 1: Fundacao Rust

| # | Tarefa | Arquivos | Depende |
|---|--------|----------|---------|
| 1.1 | Criar Cargo workspace | `Cargo.toml` | - |
| 1.2 | Criar crate db | `crates/db/Cargo.toml`, `src/lib.rs` | 1.1 |
| 1.3 | Criar migration tasks | `crates/db/migrations/001_create_tasks.sql` | 1.2 |
| 1.4 | Criar Task model | `crates/db/src/models/task.rs` | 1.3 |
| 1.5 | Testes Task model | `crates/db/src/models/task.rs` (tests mod) | 1.4 |

### Bloco 2: Server

| # | Tarefa | Arquivos | Depende |
|---|--------|----------|---------|
| 2.1 | Criar crate server | `crates/server/Cargo.toml`, `src/main.rs` | 1.2 |
| 2.2 | AppState + routes setup | `src/state.rs`, `src/routes/mod.rs` | 2.1 |
| 2.3 | CRUD routes /api/tasks | `src/routes/tasks.rs` | 2.2 |
| 2.4 | Static files serving | `src/main.rs` | 2.3 |
| 2.5 | Abrir browser automatico | `src/main.rs` | 2.4 |

### Bloco 3: Executor

| # | Tarefa | Arquivos | Depende |
|---|--------|----------|---------|
| 3.1 | Criar crate executor | `crates/executor/Cargo.toml`, `src/lib.rs` | 1.1 |
| 3.2 | Claude spawner | `src/claude.rs` | 3.1 |
| 3.3 | Output streaming | `src/claude.rs` | 3.2 |
| 3.4 | Start/Cancel routes | `crates/server/src/routes/tasks.rs` | 3.3, 2.3 |

### Bloco 4: WebSocket

| # | Tarefa | Arquivos | Depende |
|---|--------|----------|---------|
| 4.1 | WS handler no server | `crates/server/src/routes/ws.rs` | 2.2 |
| 4.2 | Broadcast de logs | `crates/server/src/routes/ws.rs` | 4.1, 3.3 |
| 4.3 | Task status updates | `crates/server/src/routes/ws.rs` | 4.2 |

### Bloco 5: Frontend Setup

| # | Tarefa | Arquivos | Depende |
|---|--------|----------|---------|
| 5.1 | Vite + React setup | `frontend/package.json`, `vite.config.ts` | - |
| 5.2 | Tailwind config | `tailwind.config.js`, `postcss.config.js` | 5.1 |
| 5.3 | TypeScript config | `tsconfig.json` | 5.1 |
| 5.4 | Entry point | `index.html`, `src/main.tsx`, `src/App.tsx` | 5.2 |

### Bloco 6: Frontend Types + API

| # | Tarefa | Arquivos | Depende |
|---|--------|----------|---------|
| 6.1 | Task types (Zod) | `src/types/task.ts` | 5.3 |
| 6.2 | Testes de types | `src/types/task.test.ts` | 6.1 |
| 6.3 | API client | `src/lib/api.ts` | 6.1 |
| 6.4 | Testes API client | `src/lib/api.test.ts` | 6.3 |

### Bloco 7: Frontend Hooks

| # | Tarefa | Arquivos | Depende |
|---|--------|----------|---------|
| 7.1 | useTasks hook | `src/hooks/useTasks.ts` | 6.3 |
| 7.2 | useWebSocket hook | `src/hooks/useWebSocket.ts` | 6.1 |

### Bloco 8: Frontend Components

| # | Tarefa | Arquivos | Depende |
|---|--------|----------|---------|
| 8.1 | TaskCard component | `src/components/TaskCard.tsx` | 7.1 |
| 8.2 | KanbanColumn component | `src/components/KanbanColumn.tsx` | 8.1 |
| 8.3 | KanbanBoard component | `src/components/KanbanBoard.tsx` | 8.2 |
| 8.4 | CreateTaskModal | `src/components/CreateTaskModal.tsx` | 7.1 |
| 8.5 | LogPanel component | `src/components/LogPanel.tsx` | 7.2 |
| 8.6 | Layout + integracao | `src/App.tsx` | 8.3, 8.4, 8.5 |

### Bloco 9: NPX CLI

| # | Tarefa | Arquivos | Depende |
|---|--------|----------|---------|
| 9.1 | CLI package setup | `npx-cli/package.json` | - |
| 9.2 | CLI script | `npx-cli/bin/cli.js` | 9.1 |
| 9.3 | Detectar git repo | `npx-cli/bin/cli.js` | 9.2 |

### Bloco 10: Integracao

| # | Tarefa | Arquivos | Depende |
|---|--------|----------|---------|
| 10.1 | Build frontend para prod | `frontend/package.json` | 8.6 |
| 10.2 | Embed frontend no Rust | `crates/server/src/main.rs` | 10.1 |
| 10.3 | Teste E2E manual | - | 10.2, 9.3 |

---

## Resumo de Arquivos

### Criar

**Rust:**
```
Cargo.toml
crates/
  db/
    Cargo.toml
    migrations/001_create_tasks.sql
    src/lib.rs
    src/models/mod.rs
    src/models/task.rs
  server/
    Cargo.toml
    src/main.rs
    src/state.rs
    src/routes/mod.rs
    src/routes/tasks.rs
    src/routes/ws.rs
  executor/
    Cargo.toml
    src/lib.rs
    src/claude.rs
```

**Frontend:**
```
frontend/
  package.json
  vite.config.ts
  tailwind.config.js
  postcss.config.js
  tsconfig.json
  index.html
  src/
    main.tsx
    App.tsx
    index.css
    types/task.ts
    types/task.test.ts
    lib/api.ts
    lib/api.test.ts
    hooks/useTasks.ts
    hooks/useWebSocket.ts
    components/TaskCard.tsx
    components/KanbanColumn.tsx
    components/KanbanBoard.tsx
    components/CreateTaskModal.tsx
    components/LogPanel.tsx
```

**NPX CLI:**
```
npx-cli/
  package.json
  bin/cli.js
```

### Modificar

- Nenhum (projeto novo)

### Deletar

- Nenhum

---

## Riscos

| Risco | Probabilidade | Mitigacao |
|-------|---------------|-----------|
| sqlx compile-time check | Media | Usar .env com DATABASE_URL temporario |
| Claude Code nao instalado | Alta | Verificar no startup, mensagem clara |
| WebSocket disconnect | Media | Reconnect com exponential backoff |
| Porta em uso | Baixa | Port fallback automatico |

---

## Quality Gates

Apos implementacao:
- [ ] `cargo build --release` sem erros
- [ ] `cargo test` passa (crates/db)
- [ ] `npm run build` sucesso (frontend)
- [ ] `npm test` passa (frontend)
- [ ] `npx eval-kanban` abre browser
- [ ] Criar tarefa funciona
- [ ] Executar tarefa mostra logs
- [ ] Drag-and-drop funciona

---

## Estimativa de Tarefas

| Bloco | Tarefas | Complexidade |
|-------|---------|--------------|
| 1. Fundacao Rust | 5 | Media |
| 2. Server | 5 | Media |
| 3. Executor | 4 | Media |
| 4. WebSocket | 3 | Media |
| 5. Frontend Setup | 4 | Baixa |
| 6. Types + API | 4 | Baixa |
| 7. Hooks | 2 | Baixa |
| 8. Components | 6 | Media |
| 9. NPX CLI | 3 | Baixa |
| 10. Integracao | 3 | Baixa |
| **Total** | **39** | - |

---

*Plano gerado em: 2025-01-16*
*Aguardando aprovacao para implementacao*
