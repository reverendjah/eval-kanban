# Fase 3: Planner

## Passo 0: Context

SE continuacao direta de 02-spec (mesma sessao):
  Contexto ja disponivel, prosseguir

SE retomando sessao interrompida:
```
Read .claude/specs/current.md
```

---

## Passo 1: Pensamento Estruturado

Usar `mcp__sequential-thinking__sequentialthinking` para planejar:

1. **Thought 1**: Quais são as dependências entre tarefas?
2. **Thought 2**: Qual ordem minimiza retrabalho?
3. **Thought 3**: Quais riscos podem bloquear implementação?
4. **Thought 4**: Onde reutilizar código vs criar novo?
5. **Thought 5**: Quais testes preciso para cada tarefa?

`totalThoughts`: 5-7

---

## Passo 2: Análise Anti-Duplicação (OBRIGATÓRIO)

### 2.1 Mapeamento de Código Reutilizável
| Necessidade | Código Existente | Arquivo:Linha | Ação |
|-------------|------------------|---------------|------|
| [o que precisa] | [helper/service] | [path:line] | Reutilizar/Estender/Criar |

### 2.2 Oportunidades de Abstração
Se 3+ lugares usam padrão similar, criar abstração:
| Padrão Repetido | Locais | Proposta |
|-----------------|--------|----------|
| [código duplicado] | [arquivos] | [helper/hook] |

### 2.3 Checklist
- [ ] Justifiquei cada arquivo NOVO?
- [ ] Verifiquei helpers similares existentes?
- [ ] Código novo pode ser generalizado?

---

## Passo 3: Breakdown de Tarefas

Criar lista ordenada baseada na spec:

| # | Tarefa | Arquivos | Depende de |
|---|--------|----------|------------|
| 1 | [tarefa] | [arquivos] | - |
| 1.1 | Testes para tarefa 1 | [*.test.ts] | 1 |
| 2 | [tarefa] | [arquivos] | 1 |
| 2.1 | Testes para tarefa 2 | [*.test.ts] | 2 |

**Regras:**
- Tarefas pequenas (< 30 min)
- Uma responsabilidade por tarefa
- Toda função nova = teste correspondente
- Dependências claras

---

## Passo 4: Resumo de Arquivos

**Criar:**
- [novos arquivos]

**Modificar:**
- [arquivos existentes]

**Deletar:**
- [arquivos a remover]

---

## Passo 5: Riscos

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| [risco] | Alta/Média/Baixa | [como reduzir] |

---

## Passo 6: Quality Gates

Apos implementacao:
- [ ] `npm test` passa
- [ ] `npx tsc --noEmit` sem erros
- [ ] `npm run build` sucesso

---

## Passo 7: Persistir Plano

1. Usar mesmo slug da spec (gerado em 02-spec)

2. Salvar plano:
   ```
   Write .claude/plans/{slug}.md
   Write .claude/plans/current.md (copia do conteudo)
   ```

---

## Output

1. Salvar plano (usar TodoWrite para tracking)
2. Chamar `EnterPlanMode`
3. **AGUARDAR aprovacao do user**

---

## Pos-Aprovacao

Apos user aprovar via EnterPlanMode:

ACAO OBRIGATORIA: Read ~/.claude/commands/feature/04-implement.md
Executar implementacao de forma AUTONOMA.
