# Fase 7: Auto-Avaliacao

## Contexto
Commit feito. Avaliar workflow e propor melhorias ao config.

---

## Passo 1: Coletar Metricas

```bash
git diff --stat HEAD~1
git log -1 --format="%s"
```

Ler:
- .claude/specs/current.md (spec implementada)
- .claude/plans/current.md (plano seguido)

Coletar:
- Arquivos modificados
- Linhas adicionadas/removidas
- Testes criados

---

## Passo 2: Sequential Thinking #1 - DIAGNOSTICO

Usar mcp__sequential-thinking__sequentialthinking para:

**Objetivo:** Identificar problemas e causas raiz

### 2.1 Avaliar Criterios (0-100%)

| Criterio | Peso | Como Medir |
|----------|------|------------|
| Completude | 40% | Todos itens do spec implementados? |
| Qualidade | 20% | Code review passou limpo? Issues criticas? |
| Testes | 15% | Funcoes novas tem cobertura? |
| Build | 10% | Passou na primeira tentativa? |
| Autonomia | 10% | Quantas perguntas ao user? (ideal: <=2) |
| Docs | 5% | Spec/plan refletem implementacao final? |

### 2.2 Para Criterios < 80%: Aplicar 5 Whys

1. Por que o score foi baixo?
2. Qual foi a causa raiz?
3. O que poderia ter prevenido?
4. Que informacao/regra faltou?
5. Onde essa informacao deveria estar?

**Output esperado:** Lista de {problema, causa_raiz, local_ideal}

---

## Passo 3: Sequential Thinking #2 - SINTESE

Usar mcp__sequential-thinking__sequentialthinking novamente:

**Objetivo:** Transformar diagnosticos em mudancas acionaveis

Para cada problema identificado no Passo 2:

1. **Tipo de mudanca?**
   - Config: Regra no CLAUDE.md
   - Skill: Gate/validacao em fase
   - Pattern: Conhecimento para memoria

2. **Qual arquivo editar?**
   - ~/.claude/CLAUDE.md
   - ~/.claude/commands/feature/*.md
   - ~/.claude/commands/debug/*.md

3. **Diff exato da mudanca?**
   - Escrever o texto exato a adicionar

4. **Efeitos colaterais?**
   - Vai afetar outros workflows?
   - Pode causar falsos positivos?

5. **Prioridade?**
   - Alta: Problema recorrente ou critico
   - Media: Melhoria de qualidade
   - Baixa: Nice-to-have

**Output esperado:** Lista de {tipo, arquivo, diff_sugerido, prioridade}

---

## Passo 4: Propor Melhorias ao Usuario

Para cada melhoria identificada (MAXIMO 3 por execucao):

```javascript
AskUserQuestion({
  questions: [{
    question: "Detectei: {problema}. Causa: {causa_raiz}. Sugiro adicionar em {arquivo}: '{diff}'. Aplicar?",
    header: "Melhoria",
    options: [
      { label: "Aplicar", description: "Editar {arquivo} com a mudanca sugerida" },
      { label: "Ignorar", description: "Pular desta vez, pode sugerir novamente" },
      { label: "Nunca sugerir", description: "Adicionar excecao permanente" }
    ],
    multiSelect: false
  }]
})
```

### Acoes por Resposta:
- **Aplicar:** Usar Edit tool para modificar arquivo
- **Ignorar:** Prosseguir sem acao
- **Nunca sugerir:** Adicionar em ~/.claude/evaluation-exceptions.json

---

## Passo 5: Finalizar

Reportar ao user:

```
## Avaliacao do Workflow

**Score Final:** X% (Completude: X%, Qualidade: X%, Testes: X%, Build: X%, Autonomia: X%, Docs: X%)

**Melhorias Aplicadas:** N
- [lista de mudancas aplicadas]

**Workflow /feature concluido.**
```

