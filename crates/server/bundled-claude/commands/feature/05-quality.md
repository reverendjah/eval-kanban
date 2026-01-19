# Fase 5: Quality

## Contexto
Implementação completa. Executar quality gates de forma AUTÔNOMA.

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

## Regras Invioláveis

1. **PROIBIDO** pular agents de qualidade
2. **PROIBIDO** prosseguir com testes falhando
3. **PROIBIDO** prosseguir com build falhando
4. **PROIBIDO** perguntar ao user (só reportar no final)
