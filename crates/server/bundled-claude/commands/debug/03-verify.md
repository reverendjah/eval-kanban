# Fase 3: Verify

## Contexto
Fix implementado. Verificar e finalizar de forma AUTÔNOMA.

---

## Passo 1: Quality Gates

Rodar em sequência:
```bash
npm test
npx tsc --noEmit
npm run build
```

**Se falhar:** Corrigir e rodar novamente. Não prosseguir até passar.

---

## Passo 2: Verificação Final

- [ ] Testes passam
- [ ] TypeScript sem erros
- [ ] Build bem-sucedido
- [ ] Bug não reproduz mais

---

## Passo 3: Memory Sync (se bug não-óbvio)

Se o bug foi difícil de encontrar, salvar na memory:

```javascript
mcp__memory__create_entities({
  entities: [{
    name: "{prefix}:bug:{nome-descritivo}",
    entityType: "bug",
    observations: [
      "Sintoma: [...]",
      "Causa raiz: [...]",
      "Solução: [...]",
      "Arquivos: [...]"
    ]
  }]
})
```

---

## Passo 4: Relatório Final

Reportar ao user:
- Bug resolvido
- Causa raiz identificada
- Fix implementado
- Teste de regressão criado
- Quality gates passando

---

## Regras Invioláveis

1. **PROIBIDO** prosseguir com testes falhando
2. **PROIBIDO** prosseguir com build falhando
3. **PROIBIDO** perguntar ao user (só reportar no final)
