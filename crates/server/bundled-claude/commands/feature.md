---
model: opus
---
# Feature Workflow

Desenvolver: $ARGUMENTS

## INICIAR
AÇÃO OBRIGATÓRIA: Read ~/.claude/commands/feature/01-interview.md
Seguir instruções. Cada fase aponta para a próxima.

## Fluxo
Interview → Spec → Planner → [APROVAÇÃO] → Implement → Quality → Fim

## Regras
1. PROIBIDO parar entre fases (exceto EnterPlanMode)
2. PROIBIDO AskUserQuestion para aprovar spec/planner
3. PROIBIDO pedir confirmação após aprovação do plano
4. Erros: corrigir e continuar, não abandonar
