# Fase 2: Fix

## Contexto
Causa raiz identificada. Implementar fix de forma AUTÔNOMA.

---

## Passo 0: Gate de Criticidade

### 0.1 Identificar Paths Afetados

Extrair arquivos da causa raiz documentada na investigacao (fase 01-investigate).

### 0.2 Lista de Paths Criticos

```
PATHS_CRITICOS:
- **/auth/**
- **/payment/**
- **/migration*/**
- **/oauth*
- **/credential*
- **/secret*
- api/middleware.ts
- services/*Service.ts (core services)
```

### 0.3 Decision Gate

**SE** arquivos afetados ∩ PATHS_CRITICOS **nao vazio**:

1. Documentar fix planejado:
   - Causa raiz (com evidencia)
   - Arquivos a modificar
   - Mudancas propostas
   - Riscos identificados

2. Chamar `EnterPlanMode`
   - Escrever plano de fix em `.claude/plans/debug-fix-{timestamp}.md`
   - User aprova ou rejeita via ExitPlanMode

3. Apos aprovacao: Prosseguir para Passo 1

**SENAO** (nao critico):
Prosseguir direto para Passo 1 (autonomia total)

---

## Passo 1: Teste de Regressao

### 1.1 Criar Teste que Reproduz o Bug
```typescript
describe('[contexto do bug]', () => {
  it('should [comportamento esperado]', () => {
    // Arrange: setup que causa o bug
    // Act: ação que dispara o bug
    // Assert: verificar comportamento correto
  })
})
```

### 1.2 Verificar que Teste FALHA
```bash
npm test -- --testPathPattern="[arquivo]"
```

O teste DEVE falhar antes do fix. Se passar, o teste não reproduz o bug.

---

## Passo 2: Implementar Fix

### 2.1 Fix Mínimo
```
FIX:
Arquivo: [arquivo:linha]
Antes: [código atual]
Depois: [código novo]
Justificativa: [por que resolve a causa raiz]
```

### 2.2 Regras
- APENAS o necessário para resolver a causa raiz
- NÃO refatorar código não relacionado
- NÃO adicionar features
- Seguir patterns existentes do projeto

---

## Passo 3: Verificar Fix

### 3.1 Teste Deve Passar
```bash
npm test -- --testPathPattern="[arquivo]"
```

### 3.2 Bug Não Reproduz
Executar passos originais. Bug não deve ocorrer.

---

## Output

Fix implementado. Teste de regressão passando.

---
## PRÓXIMA FASE
AÇÃO OBRIGATÓRIA: Read ~/.claude/commands/debug/03-verify.md
