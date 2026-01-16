# Validator: Evidence Requirements

Gate de reproducao - criterios de evidencia por categoria.

---

## Criterios de Evidencia por Categoria

| Categoria | Evidencia Minima Requerida |
|-----------|---------------------------|
| Backend | Output do script mostrando comportamento incorreto |
| API | Response body com status code ou mensagem de erro |
| UI | Screenshot/snapshot mostrando o bug + console errors |
| Job | Log entry mostrando falha ou comportamento errado |
| Integration | Erro da API externa ou credencial invalida |
| Test | Stack trace com linha da assertion que falha |
| Infra/Deploy | Log de startup mostrando erro ou env var faltando |

---

## Decision Gate

**SE** reproduziu com sucesso (tem evidencia):
- Documentar em `REPRODUCAO`
- Prosseguir para persistir reproducao

**SE NAO** reproduziu apos executar playbook:
- Tentar proximo playbook mais provavel (se categoria incerta)
- **SE** 3 tentativas falharam:
  - Usar `AskUserQuestion` para obter mais detalhes
  - Documentar o que foi tentado
  - **NAO prosseguir ate reproduzir**

---

## Formato de Documentacao

```
REPRODUCAO:
- Categoria: [Backend/API/UI/Job/Integration/Test]
- Playbook usado: [backend/api/ui/job/integration/test/infra]
- Passos executados: [lista]
- Input: [dados de entrada]
- Output esperado: [o que deveria acontecer]
- Output real: [o que aconteceu - EVIDENCIA]
- Artefato: [scripts/debug-X.ts ou screenshot]
- Reproduzido: SIM/NAO
```
