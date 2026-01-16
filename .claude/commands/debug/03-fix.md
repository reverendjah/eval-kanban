# Fase 3: Fix

Responsabilidade: Implementar fix de forma AUTONOMA.

---

## Passo 1: Validacao Pre-Fix

### 1.1 Revisao da Categorizacao

Na fase Investigate voce categorizou seu fix como:
- [ ] CORRECAO DE LOGICA → Prossiga
- [ ] FILTRO/IGNORE → **PARE!** Volte para Investigate
- [ ] WORKAROUND → **PARE!** Volte para Investigate

### 1.2 Gate para FILTRO/IGNORE

**SE** fix envolve adicionar a lista de ignore/skip/filter:
1. Por que o erro esta sendo gerado em primeiro lugar?
2. Esse padrao pode aparecer em erros legitimos?
3. Existe forma de corrigir a logica em vez de filtrar?

**SE nao conseguir justificar**: Volte para 02-investigate.md

---

## Passo 2: Gate de Criticidade

ACAO: Read ~/.claude/commands/debug/validators/criticality-gate.md

---

## Passo 3: Gate de Permanencia

ACAO: Read ~/.claude/commands/debug/validators/fix-permanence.md

---

## Passo 4: Teste de Regressao

### 4.1 Criar Teste que Reproduz o Bug

```typescript
describe('[contexto do bug]', () => {
  it('should [comportamento esperado]', () => {
    // Arrange: setup que causa o bug
    // Act: acao que dispara o bug
    // Assert: verificar comportamento correto
  })
})
```

### 4.2 Verificar que Teste FALHA

```bash
npm test -- --testPathPattern="[arquivo]"
```

O teste DEVE falhar antes do fix. Se passar, o teste nao reproduz o bug.

---

## Passo 5: Implementar Fix

```
FIX:
Arquivo: [arquivo:linha]
Antes: [codigo atual]
Depois: [codigo novo]
Justificativa: [por que resolve a causa raiz]
```

Regras:
- APENAS o necessario para resolver a causa raiz
- NAO refatorar codigo nao relacionado
- Seguir patterns existentes do projeto

---

## Passo 6: Verificar Fix

```bash
npm test -- --testPathPattern="[arquivo]"
```

---

## Passo 7: Checkpoint

```javascript
TodoWrite({
  todos: [
    { content: "Investigate: causa raiz identificada", status: "completed", activeForm: "Root cause identified" },
    { content: "Fix: teste + correcao implementada", status: "completed", activeForm: "Fix implemented" },
    { content: "Verify: validar quality gates", status: "pending", activeForm: "Validating quality gates" }
  ]
})
```

---

## Output

Fix implementado. Teste de regressao passando.

---

## PROXIMA FASE

ACAO OBRIGATORIA: Read ~/.claude/commands/debug/04-verify.md
