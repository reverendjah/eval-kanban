# Fase 6: Auto-Avaliacao

## Contexto
Fix commitado. Avaliar workflow de debug e propor melhorias ao config.

---

## Passo 1: Coletar Metricas

```bash
git diff --stat HEAD~1
git log -1 --format="%s"
```

Ler (se existirem):
- .claude/debug/reproduction.md (como bug foi reproduzido)
- Arquivos modificados pelo fix

Coletar:
- Arquivos modificados
- Linhas adicionadas/removidas
- Testes de regressao criados

---

## Passo 2: Sequential Thinking #1 - DIAGNOSTICO

Usar mcp__sequential-thinking__sequentialthinking para:

**Objetivo:** Identificar problemas no processo de debug

### 2.1 Avaliar Criterios (0-100%)

| Criterio | Peso | Como Medir |
|----------|------|------------|
| Reproducao | 25% | Bug foi reproduzido de forma confiavel? |
| Root Cause | 25% | 5 Whys chegou na causa raiz real? |
| Fix Minimal | 20% | Fix foi minimo e cirurgico? Sem over-engineering? |
| Regressao | 15% | Teste de regressao foi criado? |
| Permanencia | 10% | Fix sobrevive restart/deploy? |
| Autonomia | 5% | Quantas perguntas ao user? (ideal: <=2) |

### 2.2 Para Criterios < 80%: Aplicar 5 Whys

1. Por que o score foi baixo?
2. Qual foi a causa raiz do problema no processo?
3. O que poderia ter prevenido?
4. Que informacao/regra faltou no skill?
5. Onde essa informacao deveria estar?

**Output esperado:** Lista de {problema, causa_raiz, local_ideal}

---

## Passo 3: Sequential Thinking #2 - SINTESE

Usar mcp__sequential-thinking__sequentialthinking novamente:

**Objetivo:** Transformar diagnosticos em mudancas acionaveis

Para cada problema identificado no Passo 2:

1. **Tipo de mudanca?**
   - Config: Regra no CLAUDE.md
   - Skill: Gate/validacao em fase de debug
   - Playbook: Adicionar ao playbook de categoria

2. **Qual arquivo editar?**
   - ~/.claude/CLAUDE.md
   - ~/.claude/commands/debug/*.md

3. **Diff exato da mudanca?**
   - Escrever o texto exato a adicionar

4. **Efeitos colaterais?**
   - Vai afetar outros tipos de bug?
   - Pode causar falsos positivos?

5. **Prioridade?**
   - Alta: Bug similar pode acontecer novamente
   - Media: Melhoria de processo
   - Baixa: Nice-to-have

**Output esperado:** Lista de {tipo, arquivo, diff_sugerido, prioridade}

---

## Passo 4: Propor Melhorias ao Usuario

Para cada melhoria identificada (MAXIMO 3 por execucao):

```javascript
AskUserQuestion({
  questions: [{
    question: "Detectei: {problema no processo}. Causa: {causa_raiz}. Sugiro adicionar em {arquivo}: '{diff}'. Aplicar?",
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
## Avaliacao do Workflow de Debug

**Score Final:** X% (Reproducao: X%, Root Cause: X%, Fix: X%, Regressao: X%, Permanencia: X%, Autonomia: X%)

**Melhorias Aplicadas:** N
- [lista de mudancas aplicadas]

**Workflow /debug concluido.**
```

---

## Regras Inviolaveis

1. **SEMPRE** executar apos commit bem-sucedido
2. **NUNCA** aplicar mudanca sem aprovacao explicita do user
3. **MAXIMO** 3 sugestoes por execucao (evitar decision fatigue)
4. **PRIORIZAR** problemas de alta prioridade primeiro
5. **NAO** sugerir mudancas se score >= 90% em todos criterios
