# Fase 6: Commit & Push

## Contexto
Quality passou. Commitar e fazer push de forma AUTÔNOMA.

---

## Passo 1: Verificar Mudanças

```bash
git status
```

**Se não houver mudanças:** Reportar "Nada a commitar" → FIM

---

## Passo 2: Analisar Diff

```bash
git diff --stat
git log --oneline -3
```

Usar diff para gerar mensagem descritiva.
Usar log para seguir padrão de commits existentes.

---

## Passo 3: Commit

```bash
git add -A
git commit -m "$(cat <<'EOF'
{type}: {descrição concisa em inglês}

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

**Tipos:**
- `feat:` nova funcionalidade
- `fix:` correção de bug
- `refactor:` reestruturação sem mudar comportamento
- `docs:` documentação
- `test:` testes

---

## Passo 4: Push

```bash
git push
```

**Se falhar:** Reportar erro ao user.

---

## Passo 5: Confirmar

```bash
git status
git log --oneline -1
```

Reportar ao user: commit criado e pushed.

---

## Passo 6: Checkpoint

Usar TodoWrite para marcar commit como "completed".
Adicionar "Evaluate: auto-avaliação do workflow" como "pending".

**Gate:** Commit deve estar pushed com sucesso.

---

## Regras

1. **1 feature = 1 commit atômico**
2. **Mensagem em inglês**
3. **NUNCA** --force push
4. **NUNCA** commitar se quality falhou

---

## PROXIMA FASE
ACAO OBRIGATORIA: Read ~/.claude/commands/feature/07-evaluate.md
