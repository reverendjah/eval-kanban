# Template: Documentacao de Reproducao

Salvar em `.claude/debug/reproduction.md`.

**O output original DEVE ser salvo na integra para comparacao em 04-verify.**

---

## Template

```markdown
# Reproducao: {descricao curta do bug}

**Data:** {timestamp}
**Bug:** {$ARGUMENTS}

## Triage
- Keywords: {lista}
- Categoria: {categoria}

## Contexto
- Logs de producao: {sim/nao}
- Arquivos identificados: {lista}

## Reproducao
- Playbook: {backend/api/ui/job/integration/test/infra}
- Artefato: {path do script ou screenshot}
- Exit code: {0 ou 1}

### Passos Executados
1. {passo}
2. {passo}

### Input
{dados de entrada}

### Output Esperado
{o que deveria acontecer}

### Output Real (EVIDENCIA) - SALVAR NA INTEGRA

\`\`\`
{COPIAR OUTPUT COMPLETO DO SCRIPT AQUI}
{Este output sera comparado em 04-verify}
\`\`\`

### Exit Code Original
- **Exit code:** {0 ou 1}
- **Bug presente:** {SIM ou NAO}

## Observacoes
{hipoteses formadas durante reproducao}
```

---

## Nota para 04-verify

O output acima sera comparado com re-execucao do script.
Se mudar de "Bug presente: SIM" para "NAO", o fix funcionou.
