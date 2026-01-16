# Template: Script de Diagnostico

Para bugs Backend/API/Job/Integration, criar `scripts/debug-{descricao}.ts`.

**Exit codes:**
- 0: Bug NAO presente (comportamento correto)
- 1: Bug PRESENTE (comportamento incorreto)

---

## Template

```typescript
#!/usr/bin/env npx tsx
/**
 * Diagnostico: {descricao do bug}
 * Bug: {$ARGUMENTS}
 * Data: {timestamp}
 */
import { config } from 'dotenv';
config();

async function diagnose(): Promise<boolean> {
  console.log('='.repeat(60));
  console.log('DIAGNOSTICO: {nome}');
  console.log('='.repeat(60));
  console.log('');

  // 1. Setup
  console.log('1. Setup...');
  // [codigo de setup]

  // 2. Reproducao
  console.log('');
  console.log('2. Reproduzindo cenario...');
  // [codigo que reproduz o cenario do bug]

  // 3. Verificacao
  console.log('');
  console.log('3. Verificando resultado...');
  // [verificar se resultado esta correto]

  const resultado = /* valor obtido */;
  const esperado = /* valor esperado */;
  const bugPresente = resultado !== esperado;

  // 4. Resultado
  console.log('');
  console.log('='.repeat(60));
  console.log('RESULTADO');
  console.log('='.repeat(60));
  console.log('Esperado:', esperado);
  console.log('Obtido:', resultado);
  console.log('Bug presente:', bugPresente ? 'SIM' : 'NAO');

  return bugPresente;
}

diagnose()
  .then(bugPresente => process.exit(bugPresente ? 1 : 0))
  .catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
  });
```

---

## Artefatos Alternativos

**Para UI:** screenshot + snapshot do Playwright
**Para Test:** output do npm test com stack trace
