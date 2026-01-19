# Fase 1: Investigate

## Passo 1: Carregar Contexto

```
mcp__memory__search_nodes({ query: "config" })
mcp__memory__search_nodes({ query: "<termos-do-bug>" })
```

Extrair termos relevantes de $ARGUMENTS e buscar bugs similares já resolvidos.

---

## Passo 2: Reproduzir Bug

### 2.1 Executar Passos
Tentar reproduzir com informações fornecidas.

### 2.2 Documentar
```
REPRODUÇÃO:
- Passos: [...]
- Input: [...]
- Output esperado: [...]
- Output real: [...]
- Reproduzido: SIM/NAO
```

### 2.3 Gate
Se NÃO reproduziu: usar AskUserQuestion para mais detalhes.
Se reproduziu: continuar.

---

## Passo 3: Verificar Estado Externo (OBRIGATÓRIO para scraping/browser)

**SE o bug envolve:** web scraping, Playwright, Puppeteer, seletores, ou qualquer interação com páginas web externas:

### 3.1 VERIFICAR ANTES DE ASSUMIR

```
1. mcp__playwright__browser_navigate({ url: "[URL do bug]" })
2. mcp__playwright__browser_wait_for({ time: 3 })
3. mcp__playwright__browser_snapshot({})
```

### 3.2 Comparar Estado Atual vs Esperado

- O que o código espera encontrar?
- O que realmente existe na página?
- Quais seletores existem/mudaram?

### 3.3 Gate

- [ ] Estado atual da página VERIFICADO com Playwright?
- [ ] Diferenças entre esperado e real DOCUMENTADAS?

**PROIBIDO:** Assumir que "a página mudou" sem verificar. SEMPRE abrir a URL e constatar.

---

## Passo 4: Explorar Código Relacionado

### 4.1 Buscar no Codebase
```
Grep: termos do bug
Glob: arquivos com nomes relacionados
git log --oneline --grep="fix" -- [arquivos suspeitos]
```

### 4.2 Identificar
- Arquivos/funções envolvidos
- Como erros são tratados nesta área
- Há validação que deveria existir?
- Há helper existente que resolve?

---

## Passo 5: 5 Whys (Causa Raiz)

Para cada "Por que?", fornecer EVIDÊNCIA de código:

```
ANÁLISE DE CAUSA RAIZ:

Sintoma: [o que está acontecendo]

Por que #1: [resposta]
  Evidência: [arquivo:linha] - [código]

Por que #2: [resposta]
  Evidência: [arquivo:linha] - [código]

Por que #3: [resposta]
  Evidência: [arquivo:linha] - [código]

CAUSA RAIZ: [declaração clara]
```

---

## Passo 6: Validar Causa Raiz

A causa raiz deve ser:
- [ ] Algo que você pode MUDAR
- [ ] Suportada por evidência de código
- [ ] Explica TODOS os sintomas

Se não validar: voltar ao Passo 5.

---

## Output

Causa raiz documentada com evidência.

---
## PRÓXIMA FASE
AÇÃO OBRIGATÓRIA: Read ~/.claude/commands/debug/02-fix.md
