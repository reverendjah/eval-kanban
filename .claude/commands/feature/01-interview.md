# Fase 1: Interview

## Passo 1: Entender o Request

Analisar $ARGUMENTS para identificar:
- Qual feature está sendo solicitada
- Termos-chave para busca
- Área provável do codebase (api/, components/, services/)

---

## Passo 2: Buscar Contexto Específico

Baseado no Passo 1, carregar APENAS o necessário:

### 2.1 Memory (se relevante)
```
mcp__memory__search_nodes({ query: "<termos-específicos-da-feature>" })
```

### 2.2 Codebase (áreas identificadas)
```
Grep: termos em <área-específica>/
Read: arquivos diretamente relacionados
```

**Evitar:** `Glob: **/*.ts` ou buscas genéricas em todo codebase.

---

## Passo 3: Identificar Patterns (sob demanda)

Após encontrar código relevante, identificar:
- Como components/services similares funcionam
- Como erros são tratados nessa área
- Patterns específicos a seguir

---

## Passo 4: Reflexão

Usar `mcp__sequential-thinking__sequentialthinking`:

1. **O que descobri** - Síntese do contexto carregado
2. **O que ainda posso descobrir** - Gaps que consigo preencher explorando mais
3. **O que APENAS o user pode responder** - Decisões de produto, preferências UX
4. **Formular perguntas mínimas** - Só o essencial

`totalThoughts`: 4

---

## Passo 5: Perguntas ao User (APENAS decisões de produto)

**Usar AskUserQuestion para todas as perguntas.**

### Perguntas típicas (adaptar ao contexto):
- **Problema**: Qual problema principal resolve? (Eficiência/Funcionalidade/UX)
- **Escopo**: MVP mínimo ou feature completa?
- **Design**: Tem referência ou seguir patterns existentes?
- **Trade-offs**: Se encontrar 2 approaches, qual preferir?

Exemplo de uso:
```javascript
AskUserQuestion({
  questions: [{
    question: "[pergunta específica]",
    header: "[2-3 palavras]",
    options: [
      { label: "[opção]", description: "[trade-off]" },
      { label: "[opção]", description: "[trade-off]" }
    ],
    multiSelect: false
  }]
})
```

---

## Passo 6: Apresentar Descobertas

Mostrar ao user:
- Services/patterns encontrados
- Tabelas relevantes do schema
- Libs que serão usadas
- Pattern que será seguido

---

## Passo 7: Persistir Interview

### 7.1 Gerar slug
Primeira palavra do problema + data. Exemplo: `filtro-2026-01-10.md`

### 7.2 Salvar respostas
```
Write .claude/interviews/{slug}.md
Write .claude/interviews/current.md (cópia do conteúdo)
```

### 7.3 Formato do arquivo
```markdown
# Interview: {feature-name}

## Contexto Descoberto
- Services encontrados: [lista]
- Patterns identificados: [lista]
- Código reutilizável: [arquivos:linhas]

## Perguntas e Respostas
| # | Pergunta | Resposta | Impacto na Implementação |
|---|----------|----------|--------------------------|
| 1 | [pergunta] | [resposta] | [como afeta] |

## Decisões Implícitas
- [decisões inferidas do contexto ou defaults do projeto]

## Termos-chave para Busca
- [termos que outras fases podem usar para grep/search]
```

---

## Passo 8: Checkpoint

Usar TodoWrite para registrar items da fase Interview como "completed".
Adicionar "Spec: gerar especificacao" como "pending".

**Gate:** Todos items de Interview devem estar "completed" E interviews/current.md deve existir.

---

## Output

Resumo estruturado:
- Problema identificado
- Escopo definido
- Decisões de UX
- Patterns a seguir

---
## PRÓXIMA FASE
AÇÃO OBRIGATÓRIA: Read ~/.claude/commands/feature/02-spec.md
