# Template: Documentacao de Causa Raiz

Criar arquivo `.claude/debug/root-cause.md`.

---

## Template

```markdown
# Causa Raiz: {descricao curta}

**Data:** {timestamp}
**Bug:** {referencia a reproduction.md}

## Classificacao do Fluxo
- [ ] ORIGEM / [ ] TRANSFORMACAO / [ ] USO

## Hipoteses Testadas
| # | Hipotese | Resultado | Evidencia |
|---|----------|-----------|-----------|
| 1 | [causa A] | Refutada | [por que] |
| 2 | [causa B] | CONFIRMADA | arquivo:linha |

## Causa Raiz
**Arquivo:** {path}
**Linha:** {numero}
**Codigo Atual:**
\`\`\`typescript
{codigo problematico}
\`\`\`

**Problema:** {explicacao clara}

## Fix Proposto
**Tipo:** CORRECAO DE LOGICA / FILTRO / WORKAROUND
**Codigo Novo:**
\`\`\`typescript
{codigo corrigido}
\`\`\`

## Validacao
- [x] Pode ser mudado no codigo
- [x] Suportada por evidencia
- [x] Explica todos os sintomas
- [x] Resolve causa, nao esconde sintoma
```
