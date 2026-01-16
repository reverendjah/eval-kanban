# Validator: Fix Permanence

Gate de permanencia - fix deve sobreviver a eventos de infra.

---

## Checklist de Sobrevivencia

O fix proposto sobrevive a:

| Evento | Sobrevive? | Justificativa |
|--------|------------|---------------|
| Docker container restart | [ ] SIM / [ ] NAO | |
| VM restart | [ ] SIM / [ ] NAO | |
| `/deploy` (build + push + reset) | [ ] SIM / [ ] NAO | |
| `terraform apply` | [ ] SIM / [ ] NAO | |
| VM destroy/create | [ ] SIM / [ ] NAO | |

---

## Gate de Correcao Manual

**SE** fix envolveu correcao manual de arquivo de config:

| Pergunta | Resposta |
|----------|----------|
| Arquivo e gerado por algum processo? | [ ] SIM / [ ] NAO |
| SE SIM: Processo gerador foi corrigido? | [ ] SIM / [ ] NAO |
| Fix sobrevive a re-geracao? | [ ] SIM / [ ] NAO |

**SE** qualquer resposta = NAO:
- Fix e PALIATIVO (sera perdido)
- **OBRIGATORIO**: Voltar para Investigate
- ACAO: Read ~/.claude/commands/debug/techniques/flow-tracing.md (Passo 4.1)

---

## Decision Gate

**SE** qualquer item = NAO:
- O fix e TEMPORARIO (hotfix/paliativo)
- Documentar: "Este fix sera perdido em [evento]"
- **OBRIGATORIO**: Implementar fix PERMANENTE que sobreviva a todos os eventos

**SE** todos = SIM:
- Prosseguir para implementacao

---

## Red Flags

> **NUNCA** declare um bug como "resolvido" se o fix nao sobrevive a `/deploy`.
>
> Fix manual na VM e um HOTFIX, nao uma solucao.
>
> Corrigir arquivo de config SEM verificar processo gerador = bug retorna no proximo deploy.
