# Fase 2: Spec

## Passo 0: Context

Contexto de projeto ja carregado em 01-interview (mesma sessao).

### 0.1 Carregar Respostas da Interview
```
Read .claude/interviews/current.md
```
Este arquivo contém: perguntas respondidas, decisões implícitas, termos-chave.
**Usar como referência** para manter consistência com o que foi acordado.

### 0.2 Buscar Patterns (se necessário)
```
mcp__memory__search_nodes({ query: "pattern" })
```

### 0.3 SE retomando sessão interrompida
```
Read .claude/interviews/current.md (contexto original)
Read .claude/specs/current.md (spec parcial, se existir)
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

### 2.2 Mapear Reutilização
| Necessidade | Código Existente | Ação |
|-------------|------------------|------|
| [o que precisa] | [arquivo:linha] | Reutilizar/Estender/Criar |

**Default = reutilizar. Código novo precisa justificativa.**

---

## Passo 3: Gerar Spec

Carregar template:
```
Read ~/.claude/templates/spec-template.md
```

Preencher template com informações coletadas na interview.

---

## Output

1. MOSTRAR spec completa ao user (visibilidade)
2. Spec = contrato, implementacao deve seguir

---

## Passo 4: Persistir Spec

1. Gerar slug: primeira palavra do problema + data
   Exemplo: `filtro-2026-01-10.md`

2. Salvar spec:
   ```
   Write .claude/specs/{slug}.md
   Write .claude/specs/current.md (copia do conteudo)
   ```

3. Confirmar: "Spec salva em .claude/specs/{slug}.md"

---

## Passo 5: Checkpoint

Usar TodoWrite para registrar items da fase Spec como "completed".
Adicionar "Planner: criar plano de tarefas" como "pending".

---
## PROXIMA FASE
ACAO OBRIGATORIA: Read ~/.claude/commands/feature/03-planner.md
