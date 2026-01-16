# Validator: Criticality Gate

Gate de criticidade - paths criticos requerem aprovacao.

---

## Lista de Paths Criticos

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

---

## Decision Gate

**SE** arquivos afetados ∩ PATHS_CRITICOS **nao vazio**:

1. Documentar fix planejado:
   - Causa raiz (com evidencia)
   - Arquivos a modificar
   - Mudancas propostas
   - Riscos identificados

2. Chamar `EnterPlanMode`
   - Escrever plano de fix em `.claude/plans/debug-fix-{timestamp}.md`
   - User aprova ou rejeita via ExitPlanMode

3. Apos aprovacao: Prosseguir para implementacao

**SENAO** (nao critico):
Prosseguir direto para implementacao (autonomia total)
