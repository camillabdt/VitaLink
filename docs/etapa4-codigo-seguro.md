# Etapa 4 — Práticas de código seguro e evidências

## Estado atual

Esta etapa **não está comprovada**. O repositório contém documentação e configuração mínima de Python, mas não contém código do VitaLink, testes de segurança executáveis nem resultado de execução. Não seria correto declarar práticas implementadas ou criar resultado artificial.

## Práticas requeridas para a implementação futura

| Prática proposta | Risco ou requisito relacionado | Evidência executável necessária | Estado |
| --- | --- | --- | --- |
| Autorizar no servidor por identidade, paciente, recurso e operação, sem aceitar esses campos como autoridade do cliente. | R03–R06, RS01 | Teste automatizado que tenta acessar recurso de outro paciente e recebe negação. | **[A confirmar]** |
| Reavaliar revogação e expiração no momento do acesso e registrar a tentativa bloqueada. | R05, RS02, RS03 | Teste automatizado que revoga/expira autorização e comprova negação e auditoria. | **[A confirmar]** |

Para concluir a etapa, cada linha precisa apontar para código, teste e saída de execução versionados. A documentação não substitui essa evidência.
