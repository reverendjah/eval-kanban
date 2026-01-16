# Fase 4: Verify

Responsabilidade: Verificar e finalizar de forma AUTONOMA.

---

## Passo 1: Quality Gates

```bash
npm test && npx tsc --noEmit && npm run build
```

**Se falhar:** ACAO: Read ~/.claude/commands/debug/self-healing.md

---

## Passo 2: Re-executar Reproducao

O script de debug DEVE ser re-executado para confirmar resolucao.

### 2.1 Executar Script

```bash
npx tsx scripts/debug-{nome-do-bug}.ts
```

**SE** script nao existe: `ls scripts/debug-*.ts` e executar mais recente.

### 2.2 Comparacao de Output

| Momento | Output |
|---------|--------|
| **ANTES** (de `.claude/debug/reproduction.md`) | [output original] |
| **DEPOIS** | [output atual] |

### 2.3 Decision Gate

**SE** output ainda mostra bug:
- Fix NAO resolveu a causa raiz
- ACAO: Read ~/.claude/commands/debug/self-healing.md

**SE** bug resolvido:
- **SE** categoria = Infra/Deploy: Consultar playbooks/infra.md
- **SENAO**: Prosseguir para 2.4

### 2.4 Converter Script em Teste de Regressao (se aplicavel)

**SE** script retornou 0 (bug ausente) E arquivo modificado em `cron/`, `services/`, `api/`, `utils/`:

1. Identificar arquivo de teste destino:
   ```
   services/foo.ts  → services/foo.test.ts
   cron/bar.ts      → cron/bar.test.ts (ou criar)
   ```

2. Converter estrutura do script:
   ```
   diagnose()           → describe('regression: {bug}')
   // 1. Setup          → beforeEach ou inline
   // 2. Reproducao     → it('should {comportamento correto}', ...)
   // 3. Verificacao    → expect(...).toBe(...)
   bugPresente ? 1 : 0  → expect(bugPresente).toBe(false)
   ```

3. Adicionar ao arquivo de teste:
   ```typescript
   describe('regression: {descricao-do-bug}', () => {
     it('should {comportamento correto apos fix}', async () => {
       // [codigo adaptado do script de debug]
       expect(resultado).toBe(esperado);
     });
   });
   ```

4. Validar: `npm test -- --filter="{arquivo}"`

**SE** bug NAO e testavel automaticamente (UI, Infra, Config):
- Pular conversao, apenas documentar em reproduction.md

**NOTA:** A conversao e recomendada, nao obrigatoria. Usar julgamento.

---

## Passo 3: Memory Sync (se bug nao-obvio)

```javascript
mcp__memory__create_entities({
  entities: [{
    name: "{prefix}:bug:{nome-descritivo}",
    entityType: "bug",
    observations: ["Sintoma: [...]", "Causa raiz: [...]", "Solucao: [...]"]
  }]
})
```

---

## Passo 4: Cleanup

### 4.1 Script de Debug

**SE** script foi convertido em teste (2.4):
```bash
rm scripts/debug-{nome-do-bug}.ts  # Codigo ja esta no teste
```

**SE** script NAO foi convertido (bug nao-testavel):
```bash
rm scripts/debug-{nome-do-bug}.ts  # Documentacao fica em reproduction.md
```

### 4.2 Manter Documentacao

NAO deletar:
- `.claude/debug/reproduction.md`
- `.claude/debug/root-cause.md`

### 4.3 Verificar Git Status

```bash
git status
```

**SE** teste de regressao foi criado: deve aparecer arquivo novo ou modificado

---

## Passo 5: Checkpoint

```javascript
TodoWrite({
  todos: [
    { content: "Fix: correcao implementada", status: "completed", activeForm: "Fix implemented" },
    { content: "Verify: quality gates + bug confirmado", status: "completed", activeForm: "Verified" },
    { content: "Verify: teste de regressao (se aplicavel)", status: "completed", activeForm: "Regression test checked" },
    { content: "Verify: cleanup feito", status: "completed", activeForm: "Cleanup done" },
    { content: "Commit: commitar e push", status: "pending", activeForm: "Committing" }
  ]
})
```

---

## Regras Inviolaveis

1. PROIBIDO prosseguir com testes/build falhando
2. PROIBIDO prosseguir sem re-executar script
3. PROIBIDO mais de 3 tentativas no self-healing
4. PROIBIDO deixar script de debug em scripts/ (converter para teste ou deletar)

---

## PROXIMA FASE

ACAO OBRIGATORIA: Read ~/.claude/commands/debug/05-commit.md
