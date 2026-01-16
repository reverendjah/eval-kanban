# Playbook: API/Endpoint

## Passos

1. **Identificar** handler em `api/handlers/` (ja feito em exploracao basica)

2. **Subir servidor** em background:
   ```bash
   npm run dev &
   ```

3. **Request** com inputs do bug:
   ```bash
   curl -X POST http://localhost:{port}/api/{endpoint} \
     -H "Content-Type: application/json" \
     -d '{"input": "valor"}'
   ```

4. **Capturar** response completa (status, body)

5. **Evidencia**: Response mostrando erro ou comportamento incorreto
