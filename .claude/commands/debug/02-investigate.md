# Fase 2: Investigate

Responsabilidade: **POR QUE** o bug acontece + **CAUSA RAIZ**

---

## Principio

> Fixes corrigem LOGICA, nao filtram SINTOMAS.
> Antes de propor FILTRO/IGNORE: por que o erro e gerado em primeiro lugar?

---

## Passo 1: Context

**SE** continuacao direta de 01-reproduce: Contexto ja disponivel.
**SE** retomando sessao: `Read .claude/debug/reproduction.md`

---

## Passo 2: Explorar Codigo

```
Grep: termos do bug
Glob: arquivos com nomes relacionados
git log --oneline --grep="fix" -- [arquivos suspeitos]
```

Identificar:
- Arquivos/funcoes envolvidos
- Como erros sao tratados nesta area
- Ha validacao que deveria existir?

---

## Passo 3: Rastreamento de Fluxo

**SE** bug envolve dados incorretos (null, undefined, formato invalido):

ACAO: Read ~/.claude/commands/debug/techniques/flow-tracing.md

---

## Passo 4: Geracao de Hipoteses

ACAO: Read ~/.claude/commands/debug/techniques/hypothesis-generation.md

---

## Passo 5: Sequential Thinking

ACAO: Read ~/.claude/commands/debug/techniques/sequential-thinking-config.md

**SE** categoria = Infra/Deploy:
Consultar secao "Fase: Investigate" em playbooks/infra.md

---

## Passo 6: Validar Causa Raiz

ACAO: Read ~/.claude/commands/debug/validators/root-cause-validation.md

---

## Passo 7: Documentar Causa Raiz

ACAO: Read ~/.claude/commands/debug/templates/root-cause-doc.md

---

## Passo 8: Checkpoint

```javascript
TodoWrite({
  todos: [
    { content: "Reproduce: bug reproduzido", status: "completed", activeForm: "Bug reproduced" },
    { content: "Investigate: causa raiz validada", status: "completed", activeForm: "Root cause validated" },
    { content: "Fix: implementar correcao", status: "pending", activeForm: "Implementing fix" }
  ]
})
```

---

## Output

Causa raiz documentada em `.claude/debug/root-cause.md`.

---

## PROXIMA FASE

ACAO OBRIGATORIA: Read ~/.claude/commands/debug/03-fix.md
