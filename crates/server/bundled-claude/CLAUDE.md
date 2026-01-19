# Claude Code - Regras Globais

## Autonomia
FAZER, não perguntar. BUSCAR, não pedir contexto.

## Workflows
| Trigger | Ação |
|---------|------|
| criar/adicionar/implementar feature | `/feature` |
| bug/erro/problema | `/debug` |

## Código
- Funções < 50 linhas, max 2 níveis nesting
- TypeScript strict, ES modules, async/await
- Zod para inputs externos
- PROIBIDO: `any`, try/catch genérico, callbacks

## Testes (BLOQUEANTE)
Código sem teste = PR rejeitado.
Exceções: config files, .d.ts, UI puro sem lógica.

## Memory
Namespace: ver CLAUDE.md do projeto.
Sincronizar via `memory-sync` ao final de workflows.
