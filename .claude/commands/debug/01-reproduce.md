# Fase 1: Reproduce

Responsabilidade: **ONDE** esta o bug + **COMO** reproduzir + **EVIDENCIA** concreta

---

## Passo 1: Triage

Classificar o bug por keywords em $ARGUMENTS:

| Categoria | Keywords |
|-----------|----------|
| Backend/Service | service, funcao, null, undefined, dados, firestore, db, retorna |
| API/Endpoint | endpoint, API, request, response, 4xx, 5xx, validation, handler |
| UI/Frontend | UI, componente, renderiza, tela, botao, estado, react, tsx |
| Job/Cron | job, cron, schedule, nao executou, analytics, executor |
| Integration | credencial, token, auth, OAuth, secret, API externa |
| Test | teste, test, falha, assertion, mock, spec |
| Infra/Deploy | VM, startup, env, terraform, deploy, container, docker, GCP, faltando |

**SE** nenhuma keyword match → Default: **Backend/Service**

```
TRIAGE:
Keywords encontradas: [...]
Categoria: [Backend/API/UI/Job/Integration/Test/Infra]
```

---

## Passo 2: Carregar Contexto

```
mcp__memory__search_nodes({ query: "config" })
mcp__memory__search_nodes({ query: "<termos-do-bug>" })
```

---

## Passo 3: Contexto Rapido

### 3.1 Logs de Producao

**SE** `.claude/debug-logs.json` existe e `enabled=true`:
```bash
{valor de commands.quick}
```

### 3.2 Exploracao Basica

```
Grep: termos do bug em services/, api/, cron/, components/
Glob: arquivos com nomes relacionados
```

```
LOCALIZACAO:
Arquivos candidatos: [arquivo1.ts, arquivo2.ts]
Funcoes suspeitas: [funcao1(), funcao2()]
```

---

## Passo 4: Executar Playbook

ACAO: Read ~/.claude/commands/debug/playbooks/{categoria}.md

| Categoria | Playbook |
|-----------|----------|
| Backend/Service | backend.md |
| API/Endpoint | api.md |
| UI/Frontend | ui.md |
| Job/Cron | job.md |
| Integration | integration.md |
| Test | test.md |
| Infra/Deploy | infra.md |

---

## Passo 5: Criar Artefato

ACAO: Read ~/.claude/commands/debug/templates/diagnosis-script.md

---

## Passo 6: Gate de Reproducao

ACAO: Read ~/.claude/commands/debug/validators/evidence-requirements.md

---

## Passo 7: Persistir Reproducao

ACAO: Read ~/.claude/commands/debug/templates/reproduction-doc.md

---

## Passo 8: Checkpoint

```javascript
TodoWrite({
  todos: [
    { content: "Reproduce: triage + playbook", status: "completed", activeForm: "Bug triaged" },
    { content: "Reproduce: artefato + evidencia", status: "completed", activeForm: "Evidence collected" },
    { content: "Investigate: analisar causa raiz", status: "pending", activeForm: "Analyzing root cause" }
  ]
})
```

---

## Output

Bug reproduzido com evidencia em `.claude/debug/reproduction.md`.

---

## PROXIMA FASE

ACAO OBRIGATORIA: Read ~/.claude/commands/debug/02-investigate.md
