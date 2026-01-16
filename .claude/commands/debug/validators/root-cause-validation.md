# Validator: Root Cause Validation

Validar causa raiz antes de propor fix.

---

## Checklist Obrigatoria

A causa raiz identificada DEVE passar em TODAS:

- [ ] Algo que voce pode MUDAR no codigo
- [ ] Suportada por evidencia de codigo (arquivo:linha)
- [ ] Explica TODOS os sintomas observados na reproducao
- [ ] **O fix vai RESOLVER o problema, nao apenas ESCONDER?**
- [ ] **Se um erro legitimo acontecer, ele ainda sera reportado?**

---

## Teste do Devil's Advocate

Antes de prosseguir, responder:

1. **"Em que situacao meu fix pode dar ERRADO?"**
   Resposta: [descreva cenario]

2. **"Meu fix resolve a CAUSA ou apenas esconde o SINTOMA?"**
   Resposta: [CAUSA / SINTOMA - se SINTOMA, volte ao Passo 2]

3. **"Se eu adicionar a uma lista de ignore, por que nao posso corrigir a logica?"**
   Resposta: [justifique ou admita que pode corrigir a logica]

4. **"Meu fix sobrevive a um /deploy? E terraform apply? E VM restart?"**
   Resposta: [SIM para todos / especificar qual falha]

---

## Categorizacao do Fix Proposto

Classifique seu fix:
- [ ] **CORRECAO DE LOGICA**: Mudar comportamento incorreto → Preferivel
- [ ] **FILTRO/IGNORE**: Adicionar a lista de coisas a ignorar → REQUER JUSTIFICATIVA
- [ ] **WORKAROUND**: Contornar sem resolver → REQUER JUSTIFICATIVA

**SE FILTRO ou WORKAROUND**: Documente por que CORRECAO DE LOGICA nao e possivel.

---

## Decision Gate

**SE** nao validar: voltar a investigacao com nova hipotese via Sequential Thinking.
