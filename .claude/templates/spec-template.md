# Spec: [Nome da Feature]

**Status:** Draft

## Problema
[1-2 frases - o problema, não a solução]

## Solução
[Descrição de alto nível]

## Escopo

### Inclui
- [Deliverable 1]
- [Deliverable 2]

### Não Inclui
- [O que não será feito]

## Design Técnico

### Dados
[Estruturas, campos novos, tabelas]

### Services
| Service | Mudanças |
|---------|----------|
| [nome] | [o que muda] |

### API (se aplicável)
[Endpoints, signatures]

### Tratamento de Erros
| Cenário | Comportamento |
|---------|---------------|
| [erro] | [o que acontece] |

### Reutilização Obrigatória
| Existente | Uso |
|-----------|-----|
| [código] | [como usar] |

### Justificativa para Código Novo
| Novo Código | Por que não reutilizar existente? |
|-------------|-----------------------------------|
| [arquivo/função] | [justificativa] |

## UI/UX (se aplicável)

### Fluxo
1. User faz X
2. Sistema responde Y

### Estados
| Estado | Display |
|--------|---------|
| Loading | [desc] |
| Empty | [desc] |
| Error | [desc] |
| Success | [desc] |

## Edge Cases
| Caso | Tratamento |
|------|------------|
| [edge] | [como tratar] |

## Testes

### Unitários (OBRIGATÓRIO)
| Função | Arquivo Teste | Casos |
|--------|---------------|-------|
| [func] | [file.test.ts] | [casos] |

### API/Integração (SE CRUD)
| Endpoint | Método | Casos |
|----------|--------|-------|
| [/api/X] | [POST] | [criar, validação 400, erro 500] |

### E2E/Smoke (SE UI)
| Fluxo | Verificação |
|-------|-------------|
| [Criar via form] | [Entidade aparece na lista] |

### Infraestrutura (SE Banco)
| Recurso | Configuração |
|---------|--------------|
| [Collection X] | [Índice: accountId + createdAt DESC] |

## Decisões
| Decisão | Justificativa |
|---------|---------------|
| [escolha] | [por quê] |
