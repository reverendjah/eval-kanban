# Playbook: Backend/Service

## Passos

1. **Identificar** service/funcao via Grep (ja feito em exploracao basica)

2. **Criar script** `scripts/debug-{descricao}.ts`:
   ```typescript
   #!/usr/bin/env npx tsx
   import { config } from 'dotenv';
   config();
   // Import do service
   // Chamada com inputs do bug
   // console.log do resultado
   ```

3. **Executar**: `npx tsx scripts/debug-{descricao}.ts`

4. **Evidencia**: Output mostrando comportamento incorreto
