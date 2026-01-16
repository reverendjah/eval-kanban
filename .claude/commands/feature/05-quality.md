# Fase 5: Quality

## Contexto
Implementação completa. Executar quality gates de forma AUTÔNOMA.

**Regra:** Não prosseguir com testes/build falhando.

---

## Passo 1: Agents de Qualidade

Executar em ordem (SE falhar, corrigir e continuar):

### 1.0 Test Fixer (BASELINE)
Garantir que codigo implementado passa nos testes ANTES de refatorar.
```javascript
Task({
  subagent_type: "test-fixer",
  prompt: "Rodar npm test. Se falhar, corrigir. NAO criar testes novos ainda - apenas garantir baseline funciona.",
  description: "Baseline test check"
})
```
SE FAIL: Corrigir antes de prosseguir.

### 1.1 Code Simplifier
```javascript
Task({
  subagent_type: "code-simplifier",
  prompt: "Simplificar codigo implementado. Reduzir complexidade. Melhorar legibilidade.",
  description: "Simplify new code"
})
```

### 1.2 DRY Enforcer
```javascript
Task({
  subagent_type: "dry-enforcer",
  prompt: "Detectar duplicacoes no codigo novo. Sugerir abstracoes. Reutilizar codigo existente.",
  description: "Remove duplications"
})
```

### 1.3 Test Fixer (VERIFICACAO)
Garantir que refatoracoes nao quebraram nada.
```javascript
Task({
  subagent_type: "test-fixer",
  prompt: "Rodar npm test apos refatoracoes. Corrigir testes que falharem. Criar testes faltantes para funcoes novas.",
  description: "Post-refactor test fix"
})
```

### 1.4 Code Reviewer
```javascript
Task({
  subagent_type: "code-reviewer",
  prompt: "Review final do codigo. Verificar qualidade, seguranca, patterns do projeto.",
  description: "Final code review"
})
```

### 1.5 Visual Validator (SE modificou UI)
Apenas se modificou: `components/`, `pages/`, `app/`, `*.css`, `*.tsx`
```javascript
Task({
  subagent_type: "visual-validator",
  prompt: "Validar UI. Iniciar dev server. Verificar erros de console. Testar fluxos modificados.",
  description: "Validate UI changes"
})
```

### 1.6 Terraform Validator (SE modificou env/terraform)
Apenas se modificou: `.env*`, `terraform/**/*.tf`, `terraform/**/*.tfvars*`, `variables.tf`
```javascript
Task({
  subagent_type: "terraform-validator",
  prompt: "Validar consistência Terraform. Verificar variáveis em .env.example, variables.tf, main.tf, tfvars.example. Corrigir inconsistências.",
  description: "Validate Terraform config"
})
```

### 1.7 CRUD Validation (SE nova entidade)
Apenas se criou novo endpoint CRUD em `api/handlers/`:
```javascript
Task({
  subagent_type: "test-fixer",
  prompt: "Executar CRUD smoke test. Para novos endpoints POST/PUT, testar criação e verificar response 200/201.",
  description: "CRUD smoke test"
})
```

---

## Passo 2: Quality Gates Finais

Rodar em sequência:
```bash
npm test
npx tsc --noEmit
npm run build
```

**Se falhar:** Corrigir e rodar novamente. Não prosseguir até passar.

---

## Passo 3: Memory Sync

```javascript
Task({
  subagent_type: "memory-sync",
  prompt: "Sincronizar knowledge graph. Atualizar entidades obsoletas. Criar novas para patterns/conhecimento adquirido.",
  description: "Sync memory graph"
})
```

---

## Passo 4: Relatório Final

Reportar ao user:
- Feature implementada
- Testes criados/passando
- Build sucesso
- Arquivos criados/modificados

---

## Passo 5: Checkpoint

Usar TodoWrite para marcar quality gates como "completed".
Adicionar "Commit: commitar e fazer push" como "pending".

**Gate:** Todos quality gates devem passar (test, tsc, build).

---

## PRÓXIMA FASE
AÇÃO OBRIGATÓRIA: Read ~/.claude/commands/feature/06-commit.md

