# Fase 5: Commit & Push

## Contexto
Bug resolvido, verify passou. Commitar e fazer push de forma AUTONOMA.

---

## Passo 1: Verificar Mudancas

```bash
git status
```

**Se nao houver mudancas:** Reportar "Nada a commitar" → FIM

---

## Passo 2: Commit

```bash
git add -A
git commit -m "$(cat <<'EOF'
fix: {descricao do bug resolvido em ingles}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

**Sempre prefixo `fix:`** - workflow e de debug.

---

## Passo 3: Push

```bash
git push
```

**Se falhar:** Reportar erro ao user.

---

## Passo 4: Memory Sync

Sincronizar conhecimento adquirido durante debug (NÃO bugs - esses são efêmeros).

```javascript
Task({
  subagent_type: "memory-sync",
  prompt: "Sincronizar knowledge graph após debug. IMPORTANTE: NÃO salvar o bug em si. Salvar apenas: patterns descobertos, fluxos entendidos, procedimentos documentados, decisões arquiteturais. Se nenhum conhecimento novo significativo foi adquirido, reportar 'Sem alterações'.",
  description: "Sync memory graph"
})
```

**O que salvar:**
- Pattern novo descoberto durante investigação
- Fluxo complexo que levou tempo entender
- Procedimento de debug que pode ser reutilizado

**O que NÃO salvar:**
- O bug em si (fix está no código)
- Detalhes específicos do erro
- Stack traces ou logs

---

## Passo 5: Checkpoint Final

```javascript
TodoWrite({
  todos: [
    { content: "Reproduce: bug reproduzido", status: "completed", activeForm: "Bug reproduced" },
    { content: "Investigate: causa raiz identificada", status: "completed", activeForm: "Root cause identified" },
    { content: "Fix: correcao implementada", status: "completed", activeForm: "Fix implemented" },
    { content: "Verify: quality gates passando", status: "completed", activeForm: "Quality gates passed" },
    { content: "Commit: commitado e pushed", status: "completed", activeForm: "Committed and pushed" },
    { content: "Memory: conhecimento sincronizado", status: "completed", activeForm: "Knowledge synced" }
  ]
})
```

---

## Passo 6: Confirmar

```bash
git log --oneline -1
```

Reportar ao user: fix commitado e pushed.

---

## Regras

1. **1 fix = 1 commit**
2. **Sempre `fix:` como prefixo**
3. **Mensagem em ingles**
4. **NUNCA** --force push
5. **NUNCA** commitar se verify falhou

---

## PROXIMA FASE
ACAO OBRIGATORIA: Read ~/.claude/commands/debug/06-evaluate.md
