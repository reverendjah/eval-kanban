---
model: opus
---
# Debug Workflow

Investigar e resolver: $ARGUMENTS

## INICIAR
AÇÃO OBRIGATÓRIA: Read ~/.claude/commands/debug/01-investigate.md
Seguir instruções. Cada fase aponta para a próxima.

## Fluxo
Investigate → Fix → Verify → Fim (SEM PARADAS)

## Regras
1. ZERO paradas até o final
2. ZERO perguntas ao user (exceto se não conseguir reproduzir)
3. Fix mínimo - só o necessário para resolver
4. Erros: corrigir e continuar, não abandonar
