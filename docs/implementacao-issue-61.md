# Implementação da issue #61 — metas e acompanhamento

## Estado e limite da entrega

Esta fatia permite que profissionais autorizados definam metas para exames estruturados e informem manualmente o estado de acompanhamento. Cada registro conserva seu autor. O sistema não calcula acompanhamento, não agrega metas de profissionais e não interpreta a meta como intervalo laboratorial.

## Jornadas executáveis

1. `POST /api/v1/step-up-confirmations` confirma o TOTP para `clinical_goal_write`.
2. `POST /api/v1/clinical-goals` exige `metas:anexar`, exame estruturado existente e unidade compatível.
3. `POST /api/v1/follow-up-statuses` exige `metas:anexar`, estado explícito e justificativa.
4. As listagens retornam somente versões atuais e reavaliam `metas:consultar` a cada requisição profissional; o paciente consulta os próprios registros.
5. Os endpoints `PATCH` exigem autor original, `metas:atualizar`, TOTP, versão esperada e motivo. A versão substituída permanece no banco.

Não existem endpoints de exclusão. Limites invertidos, unidade incompatível, versão concorrente, prova reutilizada, IDOR e autorização revogada são rejeitados.

## Interface conectada

`ClinicalGoals` reutiliza os cards e formulários da aplicação no detalhe profissional e na aba “Gráficos” do paciente. O componente apresenta cada faixa de meta com unidade e autor, mantém profissionais separados e mostra o acompanhamento como declaração manual. Controles de criação e correção aparecem apenas quando o escopo permite; não há remoção nem média automática.

## TDD e verificação

Os ciclos RED→GREEN começaram pela ausência dos modelos e endpoints, passaram por acompanhamento manual e alcançaram a interface. Um teste negativo revelou que uma unidade incompatível consumia a confirmação TOTP; o consumo foi movido para depois da validação integral.

| Suíte | Cobertura desta issue                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------- |
| TS03  | categoria `metas`, operações, IDOR, revogação imediata e paciente somente leitura;                    |
| TS04  | unidade compatível, limites ordenados, autoria, histórico, ausência de exclusão e conflito de versão; |
| TS06  | sucessos e negações auditados sem estado, justificativa ou conteúdo clínico;                          |
| TS08  | carregamento, vazio, criação com TOTP, correção, atribuição visual, erro e sessão expirada.           |

Em 14 de agosto de 2026, a validação executou Ruff, 73 testes backend, consistência Alembic, TypeScript, 45 testes frontend em doze arquivos, formatação e build de produção.

Os serviços `api` e `web` foram reconstruídos e ficaram saudáveis com as duas migrações aplicadas. A inspeção visual no navegador integrado foi tentada, mas o navegador recusou o certificado local autoassinado (`ERR_CERT_AUTHORITY_INVALID`). Nenhum desvio de segurança foi usado para contornar a validação TLS; a interface ficou comprovada pelos testes de componente e pelo build, não por inspeção visual manual.
