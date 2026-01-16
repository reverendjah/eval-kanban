# Fase 4: Implement

## Contexto
Plano foi aprovado. Executar de forma AUTÔNOMA até o fim.

**Regras desta fase:**
- Executar sem pedir confirmação ao user
- Erros devem ser corrigidos, não abandonados
- Seguir spec aprovada, não modificar escopo
- Toda função nova precisa de teste

---

## Passo 1: Setup

### 1.1 Carregar Contexto
```
Read .claude/specs/current.md (spec e o contrato)
Read .claude/plans/current.md (plano aprovado)
```

### 1.2 Usar TodoWrite
Registrar todas as tarefas do plano aprovado.
Marcar como `in_progress` conforme executa.

### 1.3 Relembrar Spec
A spec e o contrato. Implementacao DEVE seguir a spec.

---

## Passo 2: Implementação

Para cada tarefa do plano:

1. **Marcar in_progress** (TodoWrite)
2. **Implementar** seguindo spec e patterns do projeto
3. **Criar teste** para cada função nova
4. **Marcar completed** (TodoWrite)

### Regras de Código
- Funções < 50 linhas
- Max 2 níveis de nesting
- Tipos explícitos em exports
- Reutilizar código existente (mapeado na spec)

### Regras de Testes
- Toda função exportada = teste
- Happy path + edge cases + erros
- Seguir pattern de testes existentes no projeto

---

## Passo 3: Verificação Rápida

Após implementar cada módulo:
```bash
npm test -- --testPathPattern="[arquivo]"
npx tsc --noEmit
```

Se falhar: corrigir e continuar (não parar).

---

## Passo 4: Checkpoint

Usar TodoWrite para marcar todas tarefas de implementação como "completed".
Adicionar "Quality: executar quality gates" como "pending".

**Gate:** Todas tarefas do plano devem estar "completed".

---

## Output

Implementação completa.

---
## PRÓXIMA FASE
AÇÃO OBRIGATÓRIA: Read ~/.claude/commands/feature/05-quality.md

