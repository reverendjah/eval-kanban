# eval-kanban - Especificacao Tecnica

> Kanban board para orquestracao de tarefas com Claude Code

## 1. Visao Geral

**eval-kanban** e uma ferramenta CLI que abre uma interface web Kanban para gerenciar tarefas executadas pelo Claude Code. Inspirado no [Vibe Kanban](https://github.com/BloopAI/vibe-kanban), porem focado exclusivamente no Claude.

### Comando de Uso
```bash
cd meu-projeto
npx eval-kanban
# Abre http://localhost:9847 automaticamente
```

### Diferenciais
- Focado exclusivamente no Claude Code
- Isolamento por git worktrees (multiplas tarefas paralelas)
- Controle bidirecional de tool calls
- UX simplificada para aprovacoes

---

## 2. Arquitetura Tecnica

### 2.1 Stack

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| Backend | **Rust** | Performance para orquestracao de processos, como Vibe Kanban |
| Frontend | **React + Vite + Tailwind** | Ecossistema maduro, prototipagem rapida |
| Drag & Drop | **@hello-pangea/dnd** | Fork mantido do react-beautiful-dnd, ideal para Kanban |
| Database | **SQLite** | Zero config, arquivo unico em `~/.eval-kanban/db.sqlite` |
| Config | **JSON** | `~/.eval-kanban/config.json` com schema versionado |

### 2.2 Estrutura de Diretorios

```
eval-kanban/
├── crates/                    # Rust workspace
│   ├── server/                # HTTP server (axum)
│   ├── db/                    # SQLite + migrations (sqlx)
│   ├── executor/              # Claude Code spawner
│   ├── worktree/              # Git worktree manager
│   └── utils/                 # Helpers compartilhados
├── frontend/                  # React app
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── hooks/             # Custom hooks
│   │   ├── stores/            # State management
│   │   └── types/             # TypeScript types
│   └── package.json
├── npx-cli/                   # CLI wrapper (Node.js)
│   └── bin/cli.js
└── Cargo.toml                 # Rust workspace config
```

### 2.3 Distribuicao

```
npx eval-kanban
    │
    ▼
┌─────────────────────────────────────┐
│  npx-cli/bin/cli.js                 │
│  - Detecta plataforma (win/mac/linux)│
│  - Baixa binario pre-compilado      │
│  - Cache em ~/.eval-kanban/bin/     │
│  - Spawna o binario Rust            │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  Binario Rust                       │
│  - Inicia servidor HTTP :9847       │
│  - Serve frontend estatico          │
│  - Abre browser automaticamente     │
└─────────────────────────────────────┘
```

**Hospedagem de binarios:** Cloudflare R2 ou GitHub Releases

---

## 3. Funcionalidades

### 3.1 Kanban Board

#### Colunas (4)
| Coluna | Descricao |
|--------|-----------|
| **To Do** | Tarefas aguardando execucao |
| **In Progress** | Tarefa sendo executada pelo Claude |
| **Review** | Aguardando aprovacao do usuario |
| **Done** | Tarefas concluidas |

#### Drag & Drop
- **Livre** entre To Do, Review, Done
- **Restrito** em In Progress (sistema controla)
- **Confirmacao** para acoes criticas (cancelar tarefa em execucao)

#### Criar Tarefa
- **Input:** Titulo + Descricao livre (textarea)
- **Contexto enviado ao Claude:** Apenas a descricao (Claude explora o repo sozinho)
- **Opcional:** `append_prompt` configuravel globalmente

### 3.2 Execucao de Tarefas

#### Fluxo
```
[To Do] ──start──► [In Progress] ──complete──► [Review] ──approve──► [Done]
                        │                          │
                        │ error                    │ reject
                        ▼                          ▼
                   [Review:Failed]            [To Do] (retry)
```

#### Multiplas Tarefas Paralelas
- Cada tarefa executa em um **worktree isolado**
- Branch criado: `ek/{slug-da-tarefa}` (ex: `ek/add-login-button`)
- Sem conflitos entre tarefas

#### Visualizacao em Tempo Real
- **Aba "Terminal":** Output bruto do Claude Code (stream)
- **Aba "Structured":** Log parseado (tool calls, arquivos modificados, erros)

### 3.3 Controle de Tool Calls

#### Modos de Operacao
| Modo | Comportamento |
|------|---------------|
| **Bypass All** | Auto-aprova todas as tools. Claude roda autonomo. |
| **Interactive** | Mostra cada tool call para aprovacao via UI |

#### UI de Aprovacao (modo Interactive)
```
┌─────────────────────────────────────────────┐
│  Claude quer executar: Edit                 │
│                                             │
│  Arquivo: src/components/Button.tsx         │
│  Mudanca: Adicionar prop "disabled"         │
│                                             │
│  [Aprovar]  [Rejeitar]  [Ver Diff]          │
└─────────────────────────────────────────────┘
```

- **Sem timeout:** Tarefa fica pausada ate usuario responder
- Notificacao via **som + badge no tab** quando aguardando

### 3.4 Review de Tarefas

#### Acoes na Review
| Acao | Resultado |
|------|-----------|
| **Aprovar** | Tarefa vai para Done. Worktree mantido para merge. |
| **Rejeitar + Feedback** | Tarefa volta para To Do com feedback. Usuario pode editar descricao e retry. |

#### Tarefa com Erro
- Status: `Review:Failed`
- Mostra log de erro
- Usuario pode editar e retry

### 3.5 Git Integration

#### Worktrees
- Criado em: `~/.eval-kanban/workspaces/{project-hash}/{task-slug}/`
- Limpeza: **Manual** (usuario faz merge e deleta)
- Orphan cleanup: Ao iniciar, limpa worktrees de tarefas deletadas

#### Merge
- Botao **"Merge"** na tarefa Done
- Executa: `git checkout main && git merge ek/{task-slug}`
- Apos merge: Deleta worktree automaticamente

#### Branch Naming
- Pattern: `ek/{slug-da-tarefa}`
- Exemplo: `ek/fix-login-validation`

### 3.6 Persistencia

#### SQLite Schema (principais tabelas)
```sql
-- Tarefas
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL, -- todo, in_progress, review, done
  error_message TEXT,
  branch_name TEXT,
  worktree_path TEXT,
  created_at DATETIME,
  updated_at DATETIME
);

-- Logs de execucao
CREATE TABLE execution_logs (
  id TEXT PRIMARY KEY,
  task_id TEXT REFERENCES tasks(id),
  entry_type TEXT, -- stdout, stderr, tool_call, tool_result
  content TEXT,
  timestamp DATETIME
);

-- Aprovacoes pendentes
CREATE TABLE pending_approvals (
  id TEXT PRIMARY KEY,
  task_id TEXT REFERENCES tasks(id),
  tool_name TEXT,
  tool_input TEXT, -- JSON
  created_at DATETIME
);
```

#### Config JSON
```json
{
  "config_version": "v1",
  "theme": "system",
  "approval_mode": "interactive",
  "append_prompt": null,
  "notifications_sound": true,
  "branch_prefix": "ek"
}
```

### 3.7 Comportamentos Especiais

#### Inicializacao
```
npx eval-kanban
    │
    ├── Detecta .git no diretorio atual?
    │   ├── Sim: Abre Kanban do projeto
    │   └── Nao: Abre Home com lista de projetos recentes
    │
    ├── Ja existe instancia rodando na porta?
    │   ├── Sim: Abre browser apontando para ela
    │   └── Nao: Inicia novo servidor
    │
    └── Abre browser automaticamente
```

#### Resiliencia
- Fechar browser: Processos continuam em background
- Fechar terminal: Servidor continua rodando
- Reabrir: Mostra estado atual das tarefas

---

## 4. Fases de Implementacao

### Fase 1: Fundacao (MVP)
> Objetivo: npx funcional com Kanban basico + Claude Code

**Entregaveis:**
- [ ] Estrutura do projeto Rust + React
- [ ] NPX CLI que baixa/executa binario
- [ ] Servidor HTTP servindo frontend
- [ ] SQLite com migrations basicas
- [ ] UI: Kanban 4 colunas com drag-and-drop
- [ ] Criar tarefa (titulo + descricao)
- [ ] Spawn Claude Code via CLI
- [ ] Stream de output para UI
- [ ] Status: To Do → In Progress → Done

**Fora do escopo Fase 1:**
- Worktrees (executa no diretorio principal)
- Aprovacoes interativas (bypass-all)
- Review com feedback

---

### Fase 2: Worktrees + Paralelismo
> Objetivo: Multiplas tarefas simultaneas isoladas

**Entregaveis:**
- [ ] Criar worktree por tarefa
- [ ] Branch naming: `ek/{slug}`
- [ ] Multiplas tarefas em paralelo
- [ ] Cleanup de worktrees orfaos
- [ ] UI: Indicador de branch/worktree por tarefa

---

### Fase 3: Controle de Aprovacoes
> Objetivo: Interceptar e aprovar tool calls

**Entregaveis:**
- [ ] Protocolo bidirecional com Claude Code (stdin/stdout JSON-RPC)
- [ ] Interceptar `CanUseTool` requests
- [ ] UI: Modal de aprovacao com detalhes da tool
- [ ] Modo bypass-all vs interactive (toggle)
- [ ] Notificacoes: som + badge quando aguardando

---

### Fase 4: Review + Retry
> Objetivo: Fluxo completo de review

**Entregaveis:**
- [ ] Coluna Review funcional
- [ ] Aprovar → Done
- [ ] Rejeitar + Feedback → To Do
- [ ] Editar descricao antes de retry
- [ ] Status Failed para erros
- [ ] Exibir diff das mudancas (opcional)

---

### Fase 5: Git Integration
> Objetivo: Merge integrado

**Entregaveis:**
- [ ] Botao Merge na tarefa Done
- [ ] Executar merge automatico
- [ ] Deletar worktree apos merge
- [ ] Tratar conflitos (mostrar instrucoes)

---

### Fase 6: Polish + Config
> Objetivo: UX refinada e configuracoes

**Entregaveis:**
- [ ] Tela de configuracoes
- [ ] Tema dark/light/system
- [ ] Append prompt configuravel
- [ ] Historico de projetos recentes
- [ ] Keyboard shortcuts

---

## 5. Regras de Codigo

> Baseado em kakaroto-config

### TypeScript (Frontend)
```typescript
// CORRETO
async function fetchTasks(): Promise<Task[]> {
  const response = await fetch('/api/tasks');
  return TaskArraySchema.parse(await response.json());
}

// PROIBIDO
function fetchTasks(): any { // ❌ any
  return fetch('/api/tasks').then(r => r.json()); // ❌ callbacks
}
```

### Rust (Backend)
```rust
// CORRETO
async fn get_tasks(db: &DbPool) -> Result<Vec<Task>, ApiError> {
    sqlx::query_as!(Task, "SELECT * FROM tasks")
        .fetch_all(db)
        .await
        .map_err(ApiError::from)
}

// PROIBIDO
fn get_tasks() -> Vec<Task> { // ❌ sync
    panic!("not implemented") // ❌ panic em prod
}
```

### Regras Gerais
- Funcoes < 50 linhas
- Max 2 niveis de nesting
- Zod para validacao de inputs externos (frontend)
- Testes obrigatorios (exceto: config files, .d.ts, UI puro)

---

## 6. API Endpoints

### Tasks
```
GET    /api/tasks              # Listar todas
POST   /api/tasks              # Criar nova
GET    /api/tasks/:id          # Detalhes
PATCH  /api/tasks/:id          # Atualizar (status, descricao)
DELETE /api/tasks/:id          # Deletar

POST   /api/tasks/:id/start    # Iniciar execucao
POST   /api/tasks/:id/cancel   # Cancelar execucao
POST   /api/tasks/:id/approve  # Aprovar (Review → Done)
POST   /api/tasks/:id/reject   # Rejeitar com feedback
POST   /api/tasks/:id/merge    # Fazer merge do worktree
```

### Logs
```
GET    /api/tasks/:id/logs     # Stream de logs (SSE)
```

### Approvals
```
GET    /api/approvals/pending  # Aprovacoes pendentes
POST   /api/approvals/:id      # Responder (allow/deny)
```

### Config
```
GET    /api/config             # Configuracoes atuais
PATCH  /api/config             # Atualizar configuracoes
```

### WebSocket
```
WS     /ws                     # Real-time updates (task status, logs)
```

---

## 7. Referencias

- [Vibe Kanban](https://github.com/BloopAI/vibe-kanban) - Inspiracao principal
- [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) - Drag and drop
- [Claude Code CLI](https://docs.anthropic.com/claude-code) - Documentacao oficial

---

## 8. Decisoes de Design

| Decisao | Escolha | Alternativa Rejeitada | Motivo |
|---------|---------|----------------------|--------|
| Backend | Rust | Node.js | Performance para orquestracao de processos |
| DB | SQLite | PostgreSQL | Zero config, suficiente para uso local |
| DnD | @hello-pangea/dnd | @dnd-kit | Especifico para Kanban, menos config |
| Claude | CLI spawn | SDK | Usa instalacao existente do usuario |
| Worktrees | Por tarefa | Branch unico | Permite paralelismo sem conflitos |
| Binarios | Pre-compilados | Build local | Nao requer Rust toolchain do usuario |

---

*Documento gerado em: 2025-01-16*
*Versao: 1.0*
