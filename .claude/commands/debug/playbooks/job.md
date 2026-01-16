# Playbook: Job/Cron

## Passos

1. **Verificar config** no Firestore:
   ```typescript
   // Query job_configs para ver schedule
   // Query analytics_job_executions para ver ultima execucao
   ```

2. **Criar script** ou usar existente:
   ```bash
   npx tsx scripts/run-{job-name}.ts
   ```
   **OU** criar `scripts/debug-{job}.ts` se nao existir

3. **SE** bug em producao: buscar logs via `.claude/debug-logs.json`

4. **Evidencia**: Logs ou output mostrando falha/comportamento incorreto
