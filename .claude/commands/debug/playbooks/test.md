# Playbook: Test

## Passos

1. **Rodar teste isolado**:
   ```bash
   npm test -- --testPathPattern="{arquivo}"
   ```

2. **Identificar** assertion que falha no output

3. **SE** necessario: adicionar console.logs temporarios

4. **Evidencia**: Stack trace com linha da assertion
