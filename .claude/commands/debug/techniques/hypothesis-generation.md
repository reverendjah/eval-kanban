# Tecnica: Geracao de Hipoteses

Antes de investigar profundamente, listar MULTIPLAS causas possiveis.

---

## Passo 1: Brainstorm (minimo 3 hipoteses)

| # | Hipotese | Probabilidade | Evidencia Inicial |
|---|----------|---------------|-------------------|
| 1 | [causa A] | Alta/Media/Baixa | [o que sugere isso] |
| 2 | [causa B] | Alta/Media/Baixa | [o que sugere isso] |
| 3 | [causa C] | Alta/Media/Baixa | [o que sugere isso] |

---

## Passo 2: Ranking

Ordenar hipoteses por:
1. **Evidencia existente** (logs, reproducao, erros)
2. **Frequencia historica** (bugs similares ja resolvidos)
3. **Simplicidade** (Navalha de Occam)

---

## Passo 3: Estrategia de Exploracao

- Comecar pela hipotese #1 no Sequential Thinking
- SE refutada: usar `branchFromThought` para explorar #2
- Registrar hipoteses descartadas e POR QUE (evita repetir)
