# Implementação da issue #64 — notificações e auditoria

## Estado e limite da entrega

Esta fatia conecta a tabela de notificações já existente a uma caixa privada no sino do `Layout` e oferece, no perfil, uma projeção permitida do histórico de auditoria. Notificação e auditoria continuam independentes: ler uma notificação atualiza apenas `read_at` e acrescenta um novo evento append-only.

## Jornadas executáveis

1. `GET /api/v1/notifications` lista até cem notificações da conta autenticada sem expor a referência de domínio.
2. `PATCH /api/v1/notifications/{id}` exige sessão, CSRF e propriedade, persiste leitura individual e não revela IDs pertencentes a outra conta.
3. `GET /api/v1/audit-events` retorna até cem eventos visíveis ao ator ou à audiência pseudonimizada. A projeção contém somente identificador do evento, categoria pública, estado público e horário.
4. O sino do `Layout` abre a caixa persistida, apresenta badge de não lidas, estados de carregamento, vazio e erro e permite marcar uma linha como lida.
5. `PatientProfile` reutiliza seus cards para carregar o histórico sob demanda, tanto no perfil de paciente quanto no profissional.

## Eventos conectados

- solicitação, decisão, redução e revogação de acesso notificam a parte destinatária;
- documento aprovado ou rejeitado notifica a conta do paciente proprietário;
- mensagem e correção notificam o profissional destinatário;
- solicitação válida de recuperação notifica a própria conta;
- leitura profissional do perfil é visível ao ator profissional e à audiência paciente por identificador pseudonimizado.

Nenhuma resposta inclui nome, CPF, e-mail, conteúdo clínico, justificativa, correlação, ator, alvo, motivo ou metadado interno. O middleware operacional continua registrando somente correlação, rota normalizada, método, estado e duração para toda chamada pública.

## Atomicidade e imutabilidade

Notificação, mudança de domínio e evento de auditoria usam a mesma transação PostgreSQL quando aplicável. Um teste instala temporariamente um gatilho que rejeita `access_code.created`; a requisição pública falha e o código não é persistido. A migração acumulada mantém gatilhos que rejeitam `UPDATE` e `DELETE` em `audit_events`.

## TDD e verificação

O primeiro RED registrou `404` para `/notifications` e `/audit-events`. Ciclos seguintes registraram ausência da notificação de recuperação e dos componentes `NotificationsPanel` e `AuditHistory`. O GREEN cobre isolamento entre contas, leitura persistida, sessão expirada, projeção mínima, acesso compartilhado permitido, documento real, conta e rollback da auditoria.

| Suíte | Cobertura desta issue                                                                      |
| ----- | ------------------------------------------------------------------------------------------ |
| TS03  | somente destinatário lê notificação; paciente e profissional recebem apenas visão própria; |
| TS06  | projeção mínima, append-only, correlação operacional e rollback na falha de auditoria;     |
| TS08  | sino, badge, carregamento, vazio, erro, leitura e histórico acessíveis e persistidos.      |

Em 14 de agosto de 2026, a validação executou Ruff, 83 testes backend, consistência Alembic, TypeScript, 56 testes frontend em dezesseis arquivos, formatação e build de produção. O teste de documento usou PostgreSQL, MinIO e ClamAV reais do Compose.

A inspeção visual manual não foi repetida porque o navegador integrado continua bloqueado pelo certificado local autoassinado já documentado na #61. Nenhum desvio de TLS foi introduzido; nomes acessíveis, estados, tipagem e build foram validados automaticamente.
