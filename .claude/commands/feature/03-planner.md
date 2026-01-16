# Fase 3: Planner

## Passo 0: Context

SE continuacao direta de 02-spec (mesma sessao):
  Contexto ja disponivel, prosseguir

### 0.1 Carregar Contexto da Interview (SE necessário)
```
Read .claude/interviews/current.md
```
Consultar SE surgir dúvida sobre decisões já tomadas na Interview.
Evita re-perguntar o que já foi respondido.

### 0.2 SE retomando sessão interrompida
```
Read .claude/interviews/current.md (decisões originais)
Read .claude/specs/current.md (spec aprovada)
Read .claude/plans/current.md (plano parcial, se existir)
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

## Passo 7: Registro de Decisões

### 7.1 Decisões Tomadas
Documentar decisões feitas autonomamente durante o planejamento:

| Decisão | Opções Consideradas | Escolha | Justificativa |
|---------|---------------------|---------|---------------|
| [ex: estrutura de dados] | Array / Map | Map | Lookup O(1) necessário |
| [ex: local do código] | services/ / utils/ | services/ | Segue pattern existente |

### 7.2 Decisões Pendentes
Listar decisões que APENAS o user pode tomar:

| Decisão | Opções | Impacto na Feature |
|---------|--------|-------------------|
| [ex: formato export] | CSV / JSON / Excel | Afeta UX de download |

**Critérios para classificar como "Pendente":**
1. Impacta comportamento/UX visível ao user final
2. Não existe default claro no projeto
3. Não foi respondida na Interview (verificar interviews/current.md)

---

## Passo 8: Clarificações (CONDICIONAL)

**SE "Decisões Pendentes" NÃO estiver vazio:**

Usar AskUserQuestion para resolver cada decisão pendente.
**Limite:** Máximo 5 perguntas por execução.

```javascript
AskUserQuestion({
  questions: [{
    question: "[Decisão pendente como pergunta]",
    header: "[2-3 palavras]",
    options: [
      { label: "[Opção A]", description: "[trade-off/impacto]" },
      { label: "[Opção B]", description: "[trade-off/impacto]" }
    ],
    multiSelect: false
  }]
})
```

Após respostas:
1. Mover decisões de "Pendentes" para "Tomadas"
2. Adicionar resposta do user na coluna "Escolha"
3. Atualizar plano se necessário

**SE "Decisões Pendentes" estiver vazio:**
Prosseguir direto para Passo 9.

---

## Passo 9: Persistir Plano

1. Usar mesmo slug da spec (gerado em 02-spec)

2. Salvar plano:
   ```
   Write .claude/plans/{slug}.md
   Write .claude/plans/current.md (copia do conteudo)
   ```

---

## Passo 10: Checkpoint

Usar TodoWrite para registrar items da fase Planner como "completed".
Adicionar "Implement: executar plano aprovado" como "pending".

**Gates:**
- Plano deve estar salvo
- "Decisões Pendentes" deve estar vazio (todas resolvidas)

---

## Output

1. Salvar plano (usar TodoWrite para tracking)
2. Chamar `EnterPlanMode` (não AskUserQuestion para aprovação)
3. **AGUARDAR aprovacao do user**

**Nota:** EnterPlanMode é para aprovar o PLANO. Decisões pendentes devem ser resolvidas ANTES via AskUserQuestion (Passo 8).

---

## Pos-Aprovacao

Apos user aprovar via EnterPlanMode:

ACAO OBRIGATORIA: Read ~/.claude/commands/feature/04-implement.md
Executar implementacao de forma AUTONOMA.
