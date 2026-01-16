# Playbook: UI/Frontend

## Passos

1. **Identificar** componente (ja feito em exploracao basica)

2. **Subir dev server** em background:
   ```bash
   npm run dev &
   ```

3. **Navegar** ate pagina/componente:
   ```
   mcp__playwright__browser_navigate({ url: "http://localhost:{port}/{path}" })
   mcp__playwright__browser_wait_for({ time: 3 })
   ```

4. **Capturar estado**:
   ```
   mcp__playwright__browser_snapshot({})
   mcp__playwright__browser_console_messages({ level: "error" })
   ```

5. **Evidencia**: Snapshot mostrando bug + console errors (se houver)
