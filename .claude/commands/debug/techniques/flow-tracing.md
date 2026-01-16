# Tecnica: Rastreamento de Fluxo

Para bugs que envolvem **dados incorretos** (null, undefined, formato invalido, valor inesperado).

---

## Passo 1: Identificar Valor Problematico

- Qual valor esta errado?
- Onde ele CAUSA o erro? (arquivo:linha)

---

## Passo 2: Rastrear para Tras (Backward Tracing)

Seguir a call chain de volta ate a ORIGEM:

1. **ONDE e usado?** (ponto do erro) → arquivo:linha
2. **QUEM chama essa funcao?** → `Grep: "nomeDaFuncao("`
3. **DE ONDE vem o parametro?** → Subir na call chain
4. **ONDE o valor e definido/calculado?** → Continuar ate achar a ORIGEM

---

## Passo 3: Diagrama de Fluxo

Documentar o caminho completo:

```
FLUXO DO VALOR:
[ORIGEM]      →   [transform 1]   →   [transform 2]   →   [USO/ERRO]
arquivo1:42   →   arquivo2:108    →   arquivo3:55     →   arquivo4:23
   |                  |                   |                   |
   v                  v                   v                   v
 [valor]          [operacao]          [operacao]          [erro]
```

---

## Passo 4: Classificacao do Bug

O bug esta em qual parte do fluxo?

- [ ] **ORIGEM**: Valor ja nasce errado (ex: input invalido, query errada)
- [ ] **TRANSFORMACAO**: Valor e corrompido no caminho (ex: parsing, conversao)
- [ ] **USO**: Valor correto usado incorretamente (ex: logica errada, condicao invertida)

**IMPORTANTE**: O fix deve ser aplicado onde o problema COMECA, nao onde ele APARECE.

---

## Passo 4.1: SE Origem em Arquivo de Config Gerado

**SE** valor incorreto vem de arquivo de config (.env, .json, .yaml):

1. **O arquivo e GERADO ou EDITADO manualmente?**
   - `Grep: ">.env" ou "generate_" ou "create.*config"`

2. **SE GERADO**: Rastrear processo gerador
   - QUAL script gera o arquivo?
   - ONDE no script o valor e definido?

3. **Diagrama Estendido**:
   ```
   [PROCESSO]  →  [CONFIG]  →  [APP]
   deploy.sh   →  .env      →  app.ts
   ```

4. **Classificacao**:
   - [ ] ORIGEM EM PROCESSO: Script gera valor errado
   - [ ] ORIGEM EM TEMPLATE: Template tem erro
   - [ ] TRANSFORMACAO: Script corrompe durante geracao

**IMPORTANTE**: Corrigir arquivo manualmente e PALIATIVO.
Fix DEVE corrigir o PROCESSO GERADOR.
