# Playbook: Integration

## Passos

1. **Verificar credentials**:
   ```typescript
   import { getSecret } from '../services/secretManagerService';
   const token = await getSecret(accountSlug, '{type}');
   console.log('Token existe:', !!token);
   ```

2. **Testar autenticacao** direta com API externa

3. **Verificar** token expiry, quota, rate limit

4. **Evidencia**: Erro da API externa ou credencial invalida/expirada
