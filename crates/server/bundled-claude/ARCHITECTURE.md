# Claude Code Configuration Architecture

Este documento descreve a arquitetura de configuracao do Claude Code, otimizada para **autonomia maxima** e **contexto minimo**.

---

## Visao Geral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CONFIGURACAO CLAUDE CODE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ~/.claude/ (GLOBAL)                    projeto/.claude/ (LOCAL)           │
│   ━━━━━━━━━━━━━━━━━━━                    ━━━━━━━━━━━━━━━━━━━━━━━            │
│                                                                             │
│   ┌─────────────┐                        ┌─────────────┐                    │
│   │  CLAUDE.md  │ ◄──── herda ──────────►│  CLAUDE.md  │                    │
│   │  (regras)   │                        │  (projeto)  │                    │
│   └─────────────┘                        └─────────────┘                    │
│          │                                      │                           │
│          ▼                                      ▼                           │
│   ┌─────────────┐                        ┌─────────────┐                    │
│   │  commands/  │                        │  commands/  │                    │
│   │  (skills)   │                        │  (skills)   │                    │
│   └─────────────┘                        └─────────────┘                    │
│          │                                      │                           │
│          ▼                                      │                           │
│   ┌─────────────┐                               │                           │
│   │   agents/   │ ◄─── chamados por ────────────┘                           │
│   │(subagentes) │                                                           │
│   └─────────────┘                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Principio: Contexto Minimo por Camada

```
                    ┌───────────────────────┐
                    │     CLAUDE.md         │  ~25 linhas
                    │  (regras essenciais)  │  Carregado SEMPRE
                    └───────────┬───────────┘
                                │
                    Trigger: "/feature" ou "/debug"
                                │
                                ▼
                    ┌───────────────────────┐
                    │    commands/*.md      │  ~20 linhas
                    │   (orquestradores)    │  Carregado sob demanda
                    └───────────┬───────────┘
                                │
                    Leitura encadeada: cada fase aponta para proxima
                                │
                                ▼
                    ┌───────────────────────┐
                    │  commands/X/0N-*.md   │  ~100-150 linhas
                    │     (fases)           │  Carregado 1 por vez
                    └───────────┬───────────┘
                                │
                    Invocacao via Task tool
                                │
                                ▼
                    ┌───────────────────────┐
                    │     agents/*.md       │  ~200-300 linhas
                    │  (especialistas)      │  Carregado isolado
                    └───────────────────────┘
```

**Por que isso importa:**
- Claude nao carrega TODO o sistema de uma vez
- Cada camada e lida apenas quando necessaria
- Reduz tokens consumidos por request
- Permite instructions maiores sem overhead

---

## Hierarquia de Arquivos

### Global (~/.claude/)

```
~/.claude/
├── CLAUDE.md                 # Regras globais (todas as sessoes)
├── ARCHITECTURE.md           # Este arquivo
│
├── commands/                 # Skills disponiveis via /skill
│   ├── feature.md           # /feature - orquestrador
│   ├── feature/
│   │   ├── 01-interview.md  # Fase 1: entender requisitos
│   │   ├── 02-spec.md       # Fase 2: especificacao tecnica
│   │   ├── 03-planner.md    # Fase 3: plano de implementacao
│   │   ├── 04-implement.md  # Fase 4: codigo
│   │   └── 05-quality.md    # Fase 5: validacao
│   │
│   ├── debug.md             # /debug - orquestrador
│   ├── debug/
│   │   ├── 01-investigate.md # Fase 1: 5 Whys
│   │   ├── 02-fix.md         # Fase 2: correcao minima
│   │   └── 03-verify.md      # Fase 3: confirmar fix
│   │
│   └── gate.md              # /gate - quality gate completo
│
├── agents/                   # Subagentes especializados (7 agents)
│   ├── code-reviewer.md     # Review + auto-fix
│   ├── test-fixer.md        # Testes + auto-fix
│   ├── visual-validator.md  # Playwright + auto-fix
│   ├── code-simplifier.md   # Reducao de complexidade
│   ├── dry-enforcer.md      # Detecta duplicacao
│   ├── memory-sync.md       # Sincroniza MCP Memory
│   └── terraform-validator.md # Valida env vars
│
└── *-defaults.json           # Configs default para agents
```

### Local (projeto/.claude/)

```
projeto/.claude/
├── commands/                 # Skills especificas do projeto
│   └── *.md                 # Ex: deploy.md, test-e2e.md, etc.
│
├── specs/                    # Specs geradas pelo /feature
│   ├── {slug}.md            # Spec com nome descritivo
│   └── current.md           # Ponteiro para spec ativa
│
├── plans/                    # Planos gerados pelo /feature
│   ├── {slug}.md            # Plano com mesmo slug da spec
│   └── current.md           # Ponteiro para plano ativo
│
├── settings.json             # Config do Claude Code
├── visual-validation.json    # Routes para visual-validator (opcional)
└── terraform-validation.json # Paths para terraform-validator (opcional)
```

**Personalizacoes por projeto:**

| Arquivo | Proposito | Quando Criar |
|---------|-----------|--------------|
| `commands/*.md` | Skills especificas (deploy, E2E, migrations) | Quando projeto tem workflows unicos |
| `visual-validation.json` | Mapeia components → routes para teste | Projetos com UI complexa |
| `terraform-validation.json` | Paths de env vars e terraform | Projetos com infra como codigo |
| `settings.json` | Modelo default, permissoes, etc. | Config avancada |

**CLAUDE.md do projeto deve conter:**
- Nome e descricao do projeto
- Comandos npm (dev, build, test)
- Estrutura de pastas
- Prefixo do namespace MCP Memory (ex: `sm:`, `api:`, `web:`)

---

## Fluxo de Chamadas

### /feature (Desenvolvimento de Feature)

```
User: "adiciona filtro de data"
           │
           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  CLAUDE.md global detecta trigger "adicionar/implementar"                │
│  → Redireciona para /feature                                             │
└──────────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  commands/feature.md (orquestrador)                                      │
│  → Le: commands/feature/01-interview.md                                  │
└──────────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌────────────────────────┐     ┌────────────────────────┐
│   01-interview.md      │────►│   02-spec.md           │
│   - Explora codebase   │     │   - Gera spec tecnica  │
│   - MCP Memory         │     │   - Mapeia reutilizacao│
│   - AskUserQuestion    │     │   - Documenta decisoes │
└────────────────────────┘     └───────────┬────────────┘
                                           │
                                           ▼
┌────────────────────────┐     ┌────────────────────────┐
│   04-implement.md      │◄────│   03-planner.md        │
│   - Codigo seguindo    │     │   - EnterPlanMode      │
│     spec e plano       │     │   - Passos detalhados  │
│   - TodoWrite          │     │   - APROVACAO USER     │
└───────────┬────────────┘     └────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────────────────────┐
│   05-quality.md                                                         │
│   → Invoca agents via Task tool (ordem atualizada):                     │
│     test-fixer (baseline) → code-simplifier → dry-enforcer →            │
│     test-fixer (verificacao) → code-reviewer →                          │
│     visual-validator (se UI) → terraform-validator (se env)             │
└───────────┬────────────────────────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────────────────────┐
│   memory-sync agent                                                     │
│   - Atualiza MCP Memory com conhecimento adquirido                      │
└────────────────────────────────────────────────────────────────────────┘
```

### /debug (Resolucao de Bug)

```
User: "erro ao publicar video"
           │
           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  CLAUDE.md global detecta trigger "bug/erro/problema"                    │
│  → Redireciona para /debug                                               │
└──────────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌────────────────────────┐     ┌────────────────────────┐
│   01-investigate.md    │────►│   02-fix.md            │
│   - Reproduzir bug     │     │   - Gate de criticidade│
│   - 5 Whys com         │     │   - EnterPlanMode se   │
│     EVIDENCIA          │     │     path critico       │
└────────────────────────┘     │   - Fix MINIMO         │
                               │   - Testes obrigatorio │
                               └───────────┬────────────┘
                                           │
                                           ▼
                               ┌────────────────────────┐
                               │   03-verify.md         │
                               │   - Reproduzir fix     │
                               │   - Quality gates      │
                               │   - Salvar bug raro    │
                               │     em MCP Memory      │
                               └────────────────────────┘
```

### /gate (Quality Gate Antes de PR)

```
User: "/gate" ou invocado por /feature
           │
           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  commands/gate.md                                                        │
│  Orquestra 7 agents em sequencia, corrigindo automaticamente:            │
└──────────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐  │
│  │ test-fixer  │──►│   code-     │──►│    dry-     │──►│   code-     │  │
│  │             │   │ simplifier  │   │  enforcer   │   │  reviewer   │  │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘  │
│                                                                │         │
│                                                                ▼         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                     SE mudancas relevantes:                         ││
│  │  ┌──────────────────┐              ┌──────────────────────┐         ││
│  │  │ visual-validator │              │ terraform-validator  │         ││
│  │  │   (se UI .tsx)   │              │   (se .env/.tf)      │         ││
│  │  └──────────────────┘              └──────────────────────┘         ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Distribuicao de Responsabilidades

### CLAUDE.md (Global vs Local)

| Aspecto | Global (~/.claude/) | Local (projeto/.claude/) |
|---------|---------------------|--------------------------|
| **Escopo** | Todas as sessoes | Apenas este projeto |
| **Conteudo** | Regras de codigo, autonomia | Comandos npm, estrutura, linguagem |
| **Skills** | /feature, /debug, /gate | Skills customizadas do projeto |
| **Memory NS** | Define padrao de uso | Define prefixo unico (ex: `api:`) |
| **Tamanho** | ~25 linhas | ~30 linhas |

### Agents vs Skills

| Agents (subagentes) | Skills (commands) |
|---------------------|-------------------|
| Executam em contexto isolado | Executam no contexto principal |
| Invocados via `Task` tool | Invocados via `/skill` ou `Skill` tool |
| Especializados em UMA tarefa | Orquestram multiplas tarefas |
| Totalmente autonomos | Podem pedir aprovacao |
| ~200-300 linhas cada | ~20-150 linhas cada |

### Modelos por Componente

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ALOCACAO DE MODELOS                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  OPUS (alta qualidade, mais lento)                                  │
│  ├── commands/feature.md      → Decisoes complexas                  │
│  ├── commands/debug.md        → Root cause analysis                 │
│  └── agents/code-reviewer.md  → Julgamento de qualidade             │
│                                                                     │
│  SONNET (balanceado)                                                │
│  ├── agents/test-fixer.md        → Criacao de testes                │
│  └── agents/visual-validator.md  → Navegacao browser                │
│                                                                     │
│  HAIKU (rapido, economico)                                          │
│  └── agents/memory-sync.md       → Operacoes simples de CRUD        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Autonomia por Design

### Principios

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PILARES DA AUTONOMIA                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. FAZER, nao perguntar                                            │
│     └── Agentes corrigem problemas automaticamente                  │
│     └── Nao pedem confirmacao para fixes                            │
│                                                                     │
│  2. BUSCAR, nao pedir contexto                                      │
│     └── MCP Memory para conhecimento persistente                    │
│     └── Grep/Glob para explorar codebase                            │
│     └── AskUserQuestion APENAS para decisoes de produto             │
│                                                                     │
│  3. Regras BLOQUEANTES                                              │
│     └── Codigo sem teste = PR rejeitado                             │
│     └── Quality gates devem passar                                  │
│                                                                     │
│  4. Erros: corrigir e continuar                                     │
│     └── Nao abandonar workflow por falha                            │
│     └── Fix automatico ate 3 tentativas                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Triggers Automaticos

| Condicao | Acao Automatica |
|----------|-----------------|
| User pede "adicionar/implementar feature" | Redireciona para `/feature` |
| User menciona "bug/erro/problema" | Redireciona para `/debug` |
| Mudanca em `components/*.tsx` | `visual-validator` invocado |
| Mudanca em `.env` ou `terraform/` | `terraform-validator` invocado |
| Codigo novo sem teste | `test-fixer` cria teste |
| Fim de workflow | `memory-sync` atualiza Memory |

---

## MCP Memory Integration

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MCP MEMORY FLOW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   INICIO DE SESSAO                                                  │
│   └── search_nodes({ query: "config" })                             │
│       └── Carrega: escopo, comandos, quality gates                  │
│                                                                     │
│   DURANTE DESENVOLVIMENTO                                           │
│   └── search_nodes({ query: "<termos>" })                           │
│       └── Busca: patterns, bugs conhecidos, fluxos                  │
│                                                                     │
│   FIM DE WORKFLOW                                                   │
│   └── memory-sync agent                                             │
│       ├── Atualiza entidades obsoletas                              │
│       ├── Cria entidades para conhecimento novo                     │
│       └── Remove entidades de arquivos deletados                    │
│                                                                     │
│   NAMESPACE POR PROJETO                                             │
│   └── Prefixo definido no CLAUDE.md local                           │
│       └── Ex: sm:pattern:X, sm:bug:Y, sm:fluxo:Z                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Persistencia e Checkpoints

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PERSISTENCIA DE ESTADO                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   SPECS E PLANOS                                                    │
│   └── .claude/specs/{slug}.md      → Spec gerada                    │
│   └── .claude/specs/current.md     → Ponteiro para spec ativa       │
│   └── .claude/plans/{slug}.md      → Plano gerado                   │
│   └── .claude/plans/current.md     → Ponteiro para plano ativo      │
│                                                                     │
│   BENEFICIO: Sessao pode ser retomada sem perder contexto           │
│                                                                     │
│   CHECKPOINTS VIA TodoWrite                                         │
│   └── Cada fase registra conclusao no TodoWrite                     │
│   └── Gate: proxima fase so inicia se anterior completed            │
│   └── Visibilidade para user do progresso                           │
│                                                                     │
│   CONTEXT LOADING INTELIGENTE                                       │
│   └── 01-interview: Carrega MCP Memory (config, patterns)           │
│   └── 02-spec+: Contexto ja disponivel, apenas busca patterns       │
│   └── Retomada: Read .claude/specs/current.md                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Output Estruturado dos Agents

Todos os 7 agents retornam bloco padronizado ao final:

```
---AGENT_RESULT---
STATUS: PASS | FAIL
ISSUES_FOUND: <numero>
ISSUES_FIXED: <numero>
BLOCKING: true | false
---END_RESULT---
```

**Regras de Agregacao (05-quality.md e gate.md):**
- SE STATUS=FAIL e BLOCKING=true → Workflow PARA
- SE STATUS=FAIL e BLOCKING=false → Continua com warning
- Resultado agregado em tabela para relatorio final

---

## Beneficios desta Arquitetura

| Beneficio | Como e Alcancado |
|-----------|------------------|
| **Contexto minimo** | Leitura encadeada, arquivos pequenos |
| **Autonomia maxima** | Agents auto-corrigem, regras bloqueantes |
| **Consistencia** | Regras globais herdadas por todos projetos |
| **Flexibilidade** | Skills locais para necessidades especificas |
| **Qualidade** | /gate orquestra 7 validacoes automaticas |
| **Conhecimento** | MCP Memory persiste aprendizados |
| **Escalabilidade** | Mesmo setup funciona para N projetos |

---

## Quick Reference

```bash
# Skills globais (qualquer projeto)
/feature    # Desenvolver feature completa
/debug      # Resolver bug com 5 Whys
/gate       # Quality gate pre-PR

# Skills locais (definidas em projeto/.claude/commands/)
# Exemplos comuns:
# /deploy     # Deploy para producao
# /test-e2e   # Testes end-to-end
# /migrate    # Database migrations

# Agents (invocados automaticamente ou via Task)
test-fixer, code-reviewer, visual-validator,
code-simplifier, dry-enforcer, memory-sync,
terraform-validator
```

---

*Ultima atualizacao: Janeiro 2026*
