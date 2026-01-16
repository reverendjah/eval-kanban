---
model: opus
---
# Debug Workflow

Investigar e resolver: $ARGUMENTS

## INICIAR
ACAO OBRIGATORIA: Read ~/.claude/commands/debug/01-reproduce.md
Seguir instrucoes. Cada fase aponta para a proxima.

## Fluxo
Reproduce → Investigate → Fix → Verify → Commit → Evaluate → Fim (SEM PARADAS)

## Regras
1. ZERO paradas até o final
2. ZERO perguntas ao user (exceto se não conseguir reproduzir)
3. Fix mínimo - só o necessário para resolver
4. Erros: corrigir e continuar, não abandonar
