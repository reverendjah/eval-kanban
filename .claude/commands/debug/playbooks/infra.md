# Playbook: Infra/Deploy

## Fase: Reproduce

### Passos

1. **Ler arquivos de deploy ANTES de qualquer investigacao**:
   ```
   Read terraform/deploy.sh
   Read terraform/startup-script.sh (ou equivalente)
   Read terraform/main.tf (locals e env vars)
   Read terraform/modules/compute-instance/main.tf (lifecycle rules)
   ```

2. **Mapear ciclo de vida**:
   - Como a VM inicia?
   - Como env vars chegam no container?
   - O que acontece em `/deploy`?
   - O que acontece em `terraform apply`?

3. **Verificar logs da VM**:
   ```bash
   gcloud compute ssh {instance} --command="sudo journalctl -u google-startup-scripts -n 100"
   ```

4. **Verificar container**:
   ```bash
   gcloud compute ssh {instance} --command="sudo docker logs social-medias --tail 50"
   ```

5. **Evidencia**: Log mostrando erro de startup ou env var faltando

---

## Fase: Investigate

### Mapeamento de Ciclo de Vida

#### Diagrama de Fluxo

```
CICLO DE VIDA DO BUG:
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  terraform      │ --> │  startup script  │ --> │  container      │
│  (define vars)  │     │  (aplica vars)   │     │  (usa vars)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                       │
         v                       v                       v
   Quando muda?            Quando executa?         Quando reinicia?
   [resposta]              [resposta]              [resposta]
```

#### Perguntas Obrigatorias

1. **Onde o valor e definido?** (terraform, env, secret, hardcoded)
2. **Como o valor chega no destino?** (startup script, SCP, mount, API)
3. **O que dispara atualizacao?** (apply, deploy, restart, nada)
4. **Ha cache/ignore que bloqueia?** (ignore_changes, cache, stale)

---

## Fase: Verify

### Simulacao de Deploy

```bash
# Simular o que /deploy faria (sem executar de verdade)
cd terraform && ./deploy.sh update --dry-run

# OU se nao houver dry-run, verificar manualmente:
# 1. O que muda no startup script?
# 2. O que muda no container?
# 3. Env vars estao corretas?
```

### Teste de Permanencia

Executar UM dos seguintes (do menos ao mais destrutivo):

1. **Container restart** (rapido, sem downtime):
   ```bash
   gcloud compute ssh {instance} --command="sudo docker restart social-medias"
   # Verificar se bug nao retorna
   ```

2. **VM restart** (1-2 min downtime):
   ```bash
   gcloud compute instances reset {instance} --zone={zone}
   # Aguardar startup, verificar se bug nao retorna
   ```

3. **Deploy completo** (se mudancas em terraform):
   ```bash
   ./deploy.sh update
   # Verificar se bug nao retorna
   ```

### Criterio de Sucesso

- [ ] Fix aplicado persiste apos restart escolhido
- [ ] Logs nao mostram o erro original
- [ ] Funcionalidade afetada opera normalmente

---

## Armadilhas de Portabilidade

Scripts podem ter comportamento diferente entre macOS e Linux.

### Padroes Problematicos (BSD vs GNU)

| GNU | BSD/POSIX | Afeta |
|-----|-----------|-------|
| `\s` | `[[:space:]]` | sed, grep |
| `\d` | `[0-9]` | sed, grep |
| `sed -i ''` (macOS) | `sed -i` (Linux) | in-place |

### Checklist de Portabilidade

SE bug envolve script executado em macOS:
- [ ] Scripts usam POSIX character classes?
- [ ] Regex funciona em GNU e BSD?

### Diagnostico

```bash
# Testar regex
echo "key  = \"value\"" | sed 's/.*=\s*"\(.*\)"/\1/'
# Se retornar linha inteira: BSD nao entendeu \s
```
