# Fase 2: Spec

## Passo 0: Context

Contexto de projeto ja carregado em 01-interview (mesma sessao).
Buscar apenas patterns para reutilizacao:

```
mcp__memory__search_nodes({ query: "pattern" })
```

SE retomando sessao interrompida:
```
Read .claude/specs/current.md (se existir)
```

---

## Passo 1: Pensamento Estruturado

Usar `mcp__sequential-thinking__sequentialthinking` para planejar:

1. **Thought 1**: Quais componentes esta feature precisa?
2. **Thought 2**: Onde código similar existe no codebase?
3. **Thought 3**: Quais patterns do projeto devo seguir?
4. **Thought 4**: Quais trade-offs arquiteturais existem?
5. **Thought 5**: Qual a abordagem mais simples que resolve?

`totalThoughts`: 5-8 (ajustar conforme complexidade)

---

## Passo 2: Análise de Reutilização

### 2.1 Buscar Código Existente
```
Grep: termos da feature em services/, utils/, lib/
Glob: arquivos com nomes similares
```

### 1.2 Mapear Reutilização
| Necessidade | Código Existente | Ação |
|-------------|------------------|------|
| [o que precisa] | [arquivo:linha] | Reutilizar/Estender/Criar |

**Default = reutilizar. Código novo precisa justificativa.**

---

## Passo 2: Gerar Spec

```markdown
# Spec: [Nome da Feature]

**Status:** Draft

## Problema
[1-2 frases - o problema, não a solução]

## Solução
[Descrição de alto nível]

## Escopo

### Inclui
- [Deliverable 1]
- [Deliverable 2]

### Não Inclui
- [O que não será feito]

## Design Técnico

### Dados
[Estruturas, campos novos, tabelas]

### Services
| Service | Mudanças |
|---------|----------|
| [nome] | [o que muda] |

### API (se aplicável)
[Endpoints, signatures]

### Tratamento de Erros
| Cenário | Comportamento |
|---------|---------------|
| [erro] | [o que acontece] |

### Reutilização Obrigatória
| Existente | Uso |
|-----------|-----|
| [código] | [como usar] |

### Justificativa para Código Novo
| Novo Código | Por que não reutilizar existente? |
|-------------|-----------------------------------|
| [arquivo/função] | [justificativa] |

## UI/UX (se aplicável)

### Fluxo
1. User faz X
2. Sistema responde Y

### Estados
| Estado | Display |
|--------|---------|
| Loading | [desc] |
| Empty | [desc] |
| Error | [desc] |
| Success | [desc] |

## Edge Cases
| Caso | Tratamento |
|------|------------|
| [edge] | [como tratar] |

## Testes

### Unitários (OBRIGATÓRIO)
| Função | Arquivo Teste | Casos |
|--------|---------------|-------|
| [func] | [file.test.ts] | [casos] |

## Decisões
| Decisão | Justificativa |
|---------|---------------|
| [escolha] | [por quê] |
```

---

## Output

1. MOSTRAR spec completa ao user (visibilidade)
2. Spec = contrato, implementacao deve seguir

---

## Passo 3: Persistir Spec

1. Gerar slug: primeira palavra do problema + data
   Exemplo: `filtro-2026-01-10.md`

2. Salvar spec:
   ```
   Write .claude/specs/{slug}.md
   Write .claude/specs/current.md (copia do conteudo)
   ```

3. Confirmar: "Spec salva em .claude/specs/{slug}.md"

---

## Passo 4: Checkpoint

Atualizar TodoWrite com conclusao da spec:

```javascript
TodoWrite({
  todos: [
    // items anteriores como completed
    { content: "Spec: especificacao gerada", status: "completed", activeForm: "Generating spec" },
    { content: "Spec: reutilizacao mapeada", status: "completed", activeForm: "Mapping reuse" },
    { content: "Spec: spec persistida em arquivo", status: "completed", activeForm: "Persisting spec" },
    { content: "Planner: criar plano de tarefas", status: "pending", activeForm: "Creating plan" }
  ]
})
```

---
## PROXIMA FASE
ACAO OBRIGATORIA: Read ~/.claude/commands/feature/03-planner.md
