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
Codigo sem teste = PR rejeitado.
Excecoes: config files, .d.ts, UI puro sem logica.

### Testes Unitarios
```bash
cd frontend && npm test -- --run
```

### Testes E2E (Playwright)
Apos implementacao de features UI, executar:
```bash
cd frontend && npm run test:e2e
```

Fluxos cobertos:
- Criar/deletar tasks
- Validacao de formularios
- Conexao WebSocket
- Navegacao entre colunas

Para debug visual: `npm run test:e2e:headed`

## Memory
Namespace: ver CLAUDE.md do projeto.
Sincronizar via `memory-sync` ao final de workflows.

## Auto-Avaliacao
Apos /feature e /debug: executar fase de avaliacao (07/06-evaluate).
Dual-loop sequential thinking: diagnostico → sintese → propor melhorias ao user.
