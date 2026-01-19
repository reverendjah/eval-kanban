# Quality Gate

Validacao completa do codigo: **current changes** vs **origin/main**

**Mode:** Orquestra agents especializados para validacao abrangente. Corrige problemas automaticamente.

**Uso:** Rodar antes de push para main, ou periodicamente para garantir qualidade.

---

## Context Loading (OBRIGATORIO)

Carregar contexto do projeto:
- `mcp__memory__search_nodes({ query: "config" })` - escopo, comandos, quality gates
- `mcp__memory__search_nodes({ query: "ambiente" })` - local/producao

---

## Phase 0: Test Coverage Gate (BLOQUEANTE)

**Esta fase e BLOQUEANTE. Validacao NAO passa sem testes.**

### Verificar Cobertura

```bash
# Identificar arquivos de codigo modificados (excluindo testes)
git diff origin/main...HEAD --name-only | grep -E '\.(ts|tsx)$' | grep -v '\.test\.' | grep -v '\.d\.ts'
```

Para cada arquivo em `services/`, `utils/`, `api/`, `cron/`:
1. Verificar se existe `[arquivo].test.ts` correspondente
2. Se NAO existe: **FAIL** - invocar `test-fixer` para criar

### Se Cobertura Insuficiente

1. Invocar `Task` tool com `subagent_type: test-fixer`
2. NAO prosseguir ate testes existirem
3. Testes devem PASSAR antes de continuar para Phase 1

**Somente prosseguir quando todos os arquivos de codigo tiverem testes correspondentes.**

---

## Phase 1: Initial Quality Gates

Buscar comandos de quality gates na memory (ex: `quality_gates`).

Rodar:
```bash
npm run test && npx tsc --noEmit && npm run build
```

Se algum falhar, delegue para `test-fixer` agent para corrigir antes de prosseguir.

---

## Phase 2: Diff Analysis

```bash
git fetch origin main
git diff origin/main...HEAD --stat
```

Identificar:
- Arquivos modificados
- Linhas adicionadas/removidas
- Se arquivos de ambiente/config mudaram

---

## Phase 3: Agent Delegation

Based on changes detected, invoke appropriate agents **using Task tool with subagent_type**.

**IMPORTANTE:** Todos os agents sao TOTALMENTE AUTONOMOS - eles irao identificar E CORRIGIR problemas automaticamente.

**Ordem de execucao:**
`test-fixer (baseline) -> code-simplifier -> dry-enforcer -> test-fixer (verificacao) -> code-reviewer -> visual-validator (se UI) -> terraform-validator (se env)`

### 3.1 Test Fixer (BASELINE)

Garantir que codigo implementado passa nos testes ANTES de refatorar.

**Invoke:** `Task` tool with `subagent_type: test-fixer`

**Prompt:** "Rodar npm test. Se falhar, corrigir. NAO criar testes novos ainda - apenas garantir baseline funciona."

**Expected output:**
- All tests passing
- Baseline funcionando

**If tests fail:** Fix before proceeding. NAO prosseguir ate baseline passar.

### 3.2 Code Simplification

**Invoke:** `Task` tool with `subagent_type: code-simplifier`

**Expected output:**
- Dead code removed
- Naming improved
- Structure simplified
- Magic values extracted

### 3.3 DRY Analysis

**Invoke:** `Task` tool with `subagent_type: dry-enforcer`

**Expected output:**
- Unused existing code that should have been used
- Duplications within new code
- Abstraction opportunities

**If issues found:** Fix before proceeding.

### 3.4 Test Fixer (VERIFICACAO)

Garantir que refatoracoes nao quebraram nada.

**Invoke:** `Task` tool with `subagent_type: test-fixer`

**Prompt:** "Rodar npm test apos refatoracoes. Corrigir testes que falharem. Criar testes faltantes para funcoes novas."

**Expected output:**
- All tests passing
- New functions have tests
- No skipped tests without justification

**If tests fail:** Fix before proceeding.

### 3.5 Code Review

**Invoke:** `Task` tool with `subagent_type: code-reviewer`

**Expected output:**
- Security issues (CRITICAL)
- Type safety violations (CRITICAL)
- Code quality issues (HIGH/MEDIUM)
- Environment compatibility issues

**If CRITICAL issues found:** Fix before proceeding.

### 3.6 Visual Validation (SE UI)

**Detect UI changes:**
```bash
git diff origin/main...HEAD --name-only | grep -E '\.(tsx|css|scss)$' | grep -v '\.test\.' | grep -v '\.spec\.'
```

**If UI files found:**

**Invoke:** `Task` tool with `subagent_type: visual-validator`

**Expected output:**
- All pages load without console errors
- Modified components render correctly
- Interactions work (modals open, etc.)

**Behavior:**
- Agent is FULLY AUTONOMOUS
- Starts dev server, opens headless browser
- Navigates to modified screens
- Auto-fixes errors (max 3 attempts)
- Only returns when working OR exhausted attempts

**If FAIL after 3 attempts:** BLOCK gate, report errors to user.

### 3.7 Environment Validation (SE env)

**Detect env changes:**
```bash
git diff origin/main...HEAD --name-only | grep -E '\.env|terraform/|\.tfvars'
```

**If env/terraform files found:**

**Invoke:** `Task` tool with `subagent_type: terraform-validator`

**Expected output:**
- All env vars consistent across files (.env.example, variables.tf, main.tf, tfvars.example)
- No hardcoded paths in code
- Path pattern: `process.env.VAR || './default'`
- Auth works in both environments

**Behavior:**
- Agent is FULLY AUTONOMOUS
- Extracts variables from all config files
- Compares sets and identifies inconsistencies
- Auto-fixes missing variables in each file
- Searches and fixes hardcoded paths
- Runs `npx tsc --noEmit` to verify no errors introduced

**If FAIL:** BLOCK gate, report inconsistencies to user.

---

## Phase 4: Agent Results Aggregation

Collect results from all agents (na ordem de execucao):

| Agent | Status | Issues Found | Fixed |
|-------|--------|--------------|-------|
| test-fixer (baseline) | PASS/FAIL | X | X |
| code-simplifier | PASS/FAIL | X | X |
| dry-enforcer | PASS/FAIL | X | X |
| test-fixer (verificacao) | PASS/FAIL | X | X |
| code-reviewer | PASS/FAIL | X | X |
| visual-validator | SKIP/PASS/FAIL | X | X |
| terraform-validator | SKIP/PASS/FAIL | X | X |

---

## Phase 5: Final Verification

Re-run all quality gates after agent fixes:

```bash
npm run test && npx tsc --noEmit && npm run build
```

All must pass before proceeding.

---

## Phase 6: Boundaries Check

Buscar `codebase_scope` e `forbidden_paths` na memory.

- [ ] Somente arquivos dentro do escopo modificados
- [ ] Nenhuma mudanca em arquivos proibidos

If boundary violated, revert those changes.

---

## Phase 7: Summary Report

Gerar relatorio consolidado:

```markdown
## Quality Gate Report

**Status:** PASSED / FAILED
**Date:** [timestamp]
**Branch:** [current branch]
**Commits:** [count] commits ahead of origin/main

### Agent Analysis Summary

| Agent | Status | Issues Found | Fixed |
|-------|--------|--------------|-------|
| test-fixer (baseline) | [PASS/FAIL] | X | X |
| code-simplifier | [PASS/FAIL] | X | X |
| dry-enforcer | [PASS/FAIL] | X | X |
| test-fixer (verificacao) | [PASS/FAIL] | X | X |
| code-reviewer | [PASS/FAIL] | X | X |
| visual-validator | [SKIP/PASS/FAIL] | X | X |
| terraform-validator | [SKIP/PASS/FAIL] | X | X |

### Quality Gates

| Gate | Status |
|------|--------|
| Tests | PASS/FAIL |
| TypeScript | PASS/FAIL |
| Build | PASS/FAIL |
| Boundaries | PASS/FAIL |

### Key Findings

- [List of significant issues found and fixed]

### Recommendations

- [Any manual actions needed]
```

---

## Manual Fallback

If agent delegation is not working, fall back to manual checklist:

<details>
<summary>Manual Security Scan</summary>

| Vulnerability | Pattern | Action |
|--------------|---------|--------|
| Hardcoded Secrets | API keys, tokens in code | Move to env var |
| `eval()` usage | `eval()`, `new Function()` | Remove or replace |
| Command Injection | `child_process.exec()` with vars | Use `execFile()` |
| Sensitive Logs | Passwords, tokens in `console.log` | Remove or redact |

</details>

<details>
<summary>Manual Code Cleanup</summary>

- [ ] Delete unused imports
- [ ] Delete unused variables
- [ ] Delete commented-out code
- [ ] Rename generic variables
- [ ] Functions < 50 lines
- [ ] Nesting < 3 levels

</details>

<details>
<summary>Manual DRY Check</summary>

- [ ] Checked existing helpers before creating new?
- [ ] No duplicated functionality?

</details>
