# Fase 1: Interview

## Passo 1: Exploração Autônoma (ANTES de qualquer pergunta)

### 1.1 Carregar Contexto
```
mcp__memory__search_nodes({ query: "config" })
mcp__memory__search_nodes({ query: "<termos-da-feature>" })
```

### 1.2 Explorar Codebase
```
Glob: **/*.ts, **/*.tsx
Read: package.json, schema.prisma (se existir)
Grep: termos relacionados à feature
```

### 1.3 Identificar Patterns
- Como components similares funcionam
- Como services são estruturados
- Como erros são tratados
- Como loading states funcionam

**Você DEVE saber (não perguntar):**
- Estrutura de pastas
- Schema do banco
- Libs disponíveis
- Patterns existentes

---

## Passo 2: Reflexão (ANTES de perguntar)

Usar `mcp__sequential-thinking__sequentialthinking`:

1. **O que descobri** - Síntese da exploração (patterns, services, schema encontrados)
2. **O que ainda posso descobrir** - Gaps que consigo preencher explorando mais código
3. **O que APENAS o user pode responder** - Decisões de produto, preferências de UX
4. **Tentar descobrir o que falta** - Última tentativa autônoma antes de perguntar
5. **Formular perguntas mínimas** - Só o essencial que não consegui descobrir

`totalThoughts`: 5

---

## Passo 3: Perguntas ao User (APENAS decisões de produto)

**Usar AskUserQuestion para todas as perguntas.**

### 3.1 Problema e Escopo
```javascript
AskUserQuestion({
  questions: [
    {
      question: "Qual problema principal essa feature resolve?",
      header: "Problema",
      multiSelect: false,
      options: [
        { label: "Eficiência", description: "Processo manual que precisa ser automatizado" },
        { label: "Funcionalidade", description: "Capacidade que não existe hoje" },
        { label: "UX", description: "Experiência que precisa melhorar" }
      ]
    },
    {
      question: "Qual escopo para primeira versão?",
      header: "Escopo",
      multiSelect: false,
      options: [
        { label: "MVP mínimo", description: "Só o essencial" },
        { label: "MVP completo", description: "Casos principais cobertos" },
        { label: "Feature completa", description: "Todos os casos de uso" }
      ]
    }
  ]
})
```

### 3.2 UX (se aplicável)
```javascript
AskUserQuestion({
  questions: [{
    question: "Há design/mockup de referência?",
    header: "Design",
    multiSelect: false,
    options: [
      { label: "Sim, tenho", description: "Vou compartilhar" },
      { label: "Seguir padrão", description: "Usar patterns do app" },
      { label: "Proponha", description: "Quero sugestão" }
    ]
  }]
})
```

### 3.3 Trade-offs (apenas se houver decisão com impacto)
```javascript
AskUserQuestion({
  questions: [{
    question: "Encontrei 2 approaches. Qual prefere?",
    header: "Approach",
    multiSelect: false,
    options: [
      { label: "Approach A", description: "[trade-off A]" },
      { label: "Approach B", description: "[trade-off B]" }
    ]
  }]
})
```

---

## Passo 4: Apresentar Descobertas

Mostrar ao user:
- Services/patterns encontrados
- Tabelas relevantes do schema
- Libs que serão usadas
- Pattern que será seguido

---

## Passo 5: Checkpoint

Usar TodoWrite para registrar conclusao da fase:

```javascript
TodoWrite({
  todos: [
    { content: "Interview: contexto carregado", status: "completed", activeForm: "Loading context" },
    { content: "Interview: codebase explorado", status: "completed", activeForm: "Exploring codebase" },
    { content: "Interview: perguntas respondidas", status: "completed", activeForm: "Answering questions" },
    { content: "Interview: descobertas documentadas", status: "completed", activeForm: "Documenting findings" },
    { content: "Spec: gerar especificacao", status: "pending", activeForm: "Generating spec" }
  ]
})
```

**Gate:** SE items de Interview nao estao "completed" → Completar antes de prosseguir

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
