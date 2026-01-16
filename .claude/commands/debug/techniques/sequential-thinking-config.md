# Tecnica: Sequential Thinking para Causa Raiz

**OBRIGATORIO**: Usar `mcp__sequential-thinking__sequentialthinking` para analise profunda.

---

## Configuracao Inicial

```javascript
mcp__sequential-thinking__sequentialthinking({
  thought: "[hipotese inicial baseada em evidencias]",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 8  // MINIMO 8 thoughts
})
```

---

## Regras para Cada Thought

Cada thought DEVE conter:

1. **Hipotese especifica**: "Acredito que o bug acontece porque..."
2. **Busca de evidencia**: Usar Grep/Read para encontrar arquivo:linha
3. **Avaliacao**: A evidencia suporta ou refuta a hipotese?
4. **Proxima acao**:
   - SE suporta: Ir mais fundo ("Por que isso acontece?")
   - SE refuta: Marcar `isRevision: true` e tentar alternativa

---

## Parametros Especiais

| Parametro | Quando Usar |
|-----------|-------------|
| `isRevision: true` | Quando descartando hipotese anterior |
| `revisesThought: N` | Indicar qual thought esta sendo revisado |
| `branchFromThought: N` | Quando explorando caminho alternativo |
| `branchId: "hipotese-2"` | Identificar o branch atual |
| `needsMoreThoughts: true` | Se precisa ir mais fundo |

---

## Criterios de Parada

Somente definir `nextThoughtNeeded: false` quando:

- [ ] Chegou em algo que PODE SER MUDADO no codigo
- [ ] Tem EVIDENCIA concreta (arquivo:linha + codigo)
- [ ] Nao ha mais "por que?" logico para perguntar
- [ ] A causa identificada explica TODOS os sintomas

---

## Exemplo de Fluxo

```
Thought 1: "Hipotese: erro em validateInput()"
  → Grep encontra validacao em services/videoService.ts:45
  → Evidencia: funcao nao valida campo X

Thought 2: "Por que nao valida campo X?"
  → Read services/videoService.ts
  → Evidencia: schema Zod nao inclui X (linha 12)

Thought 3: "Por que schema nao inclui X?"
  → git log mostra: adicionado em commit abc123
  → Evidencia: campo X e novo, schema desatualizado

Thought 4 (isRevision=true): "Mas wait, X deveria ser opcional..."
  → Re-analisando: o problema e que X e required no destino

Thought 5: "Onde X e required?"
  → Grep encontra em api/handlers/upload.ts:78
  → Evidencia: handler espera X mas nao recebe

... continua ate causa raiz confirmada ...
```
