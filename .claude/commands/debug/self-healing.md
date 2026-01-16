# Self-Healing Loop

## Contexto
Ativado quando quality gates falham OU bug ainda reproduz OU fix nao e permanente.

---

## Passo 1: Controle de Tentativas

```
TENTATIVA_ATUAL: {1/2/3}
```

**SE** tentativa > 3:
- PARAR imediatamente
- Reportar ao usuario com analise completa
- Documentar o que foi tentado e por que falhou
- NAO continuar autonomamente

---

## Passo 2: Analise de Falha (Sequential Thinking)

Antes de tentar corrigir, ENTENDER por que falhou:

```javascript
mcp__sequential-thinking__sequentialthinking({
  thought: "Analisando falha da verificacao...",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
})
```

Thoughts obrigatorios:

1. **"O que meu fix mudou exatamente?"**
   - Listar arquivos e linhas modificados

2. **"O que a falha esta me dizendo?"**
   - Se teste: qual assertion falhou?
   - Se build: qual erro de compilacao?
   - Se reproducao: qual sintoma persiste?

3. **"Minha causa raiz estava correta?"**
   - Revisitar `.claude/debug/root-cause.md`
   - A evidencia ainda se sustenta?

4. **"O que eu perdi na analise?"**
   - Ha outro caminho de codigo afetado?
   - Ha efeito colateral nao considerado?

5. **"Qual a proxima acao?"**
   - Determinar para onde voltar

---

## Passo 3: Decision Gate

Baseado na analise, escolher UMA opcao:

| Situacao | Acao |
|----------|------|
| Fix incompleto (faltou parte) | Voltar para 03-fix, completar |
| Causa raiz parcial (faltou profundidade) | Voltar para 02-investigate Passo 5 |
| Causa raiz errada (hipotese refutada) | Voltar para 02-investigate Passo 4 |
| Reproducao insuficiente | Voltar para 01-reproduce |

---

## Passo 4: Documentar Tentativa

Adicionar em `.claude/debug/attempts.md`:

```markdown
## Tentativa {N}

**Data:** {timestamp}
**Falha em:** Quality Gate / Reproducao / Permanencia

**O que foi tentado:**
{descricao do fix}

**Por que falhou:**
{analise via Sequential Thinking}

**Proxima acao:**
{para onde voltar e por que}
```

---

## Passo 5: Incrementar e Continuar

```
TENTATIVA_ATUAL += 1
```

Executar a acao definida no Decision Gate.
