# Implementação da issue #55 — concessão e consulta autorizada

## Estado e limite da entrega

Esta fatia conecta a decisão do paciente, a autorização temporária e a consulta do profissional à API e ao PostgreSQL. A concessão exige TOTP adicional, categorias, operações e prazo entre 1 e 90 dias. Revogação, redução de escopo e recursos clínicos permanecem fora desta issue.

## Jornada executável

1. `GET /api/v1/access-requests` lista somente as solicitações dirigidas ao paciente autenticado, com identidade profissional mínima e justificativa.
2. O paciente recusa uma pendência em `POST /api/v1/access-requests/{id}/decisions` sem criar autorização.
3. Para conceder, o paciente confirma TOTP em `POST /api/v1/step-up-confirmations` com a ação `authorization_grant` e envia categorias, operações, prazo e confirmação de uso único na decisão.
4. A mesma transação altera a solicitação e persiste paciente, profissional, escopo, início, fim, estado e momento da mudança na autorização.
5. `GET /api/v1/authorizations` lista somente autorizações das quais o usuário autenticado participa.
6. `GET /api/v1/patients` apresenta ao profissional apenas pacientes com autorização ativa e não expirada.
7. `GET /api/v1/patients/{id}` reavalia `histórico/consultar` no servidor antes de devolver os dados mínimos do perfil.

## Controles verificáveis

- negar por padrão e reavaliar profissional, paciente, categoria, operação, estado, início e fim em cada leitura protegida;
- normalizar o escopo e aceitar somente as nove categorias e as três operações definidas em DS04;
- exigir prazo inteiro entre 1 e 90 dias e impedir autorização sem fim;
- vincular o step-up à conta, sessão, ação, validade de cinco minutos e uso único;
- bloquear troca de identificador na decisão e devolver a mesma resposta para paciente inexistente, desconhecido ou não autorizado;
- remover imediatamente autorizações expiradas da lista e negar o detalhe sem encerrar a sessão autenticada;
- registrar concessão, recusa, leitura e negação em auditoria sem incluir TOTP, sessão ou conteúdo clínico;
- não usar nome, CPF, e-mail, sessão ou conhecimento do identificador como autoridade;
- não publicar link de acesso ou URL permanente de recurso.

## Interface conectada

O paciente consulta pendências, seleciona categorias e operações, informa prazo e TOTP, concede ou recusa e visualiza “Compartilhado com” a partir da API. O profissional solicita acesso por código, pesquisa e filtra apenas cartões autorizados e abre um detalhe novamente validado pela API. Na entrega desta issue, dados clínicos pertencentes às fatias posteriores ainda não apareciam nessa rota.

O dashboard legado foi preservado no repositório, mas deixou de ser o ponto de entrada renderizado. Essa decisão evita remover antecipadamente trabalho que poderá ser reaproveitado nas issues clínicas seguintes, sem expor dados simulados na jornada da #55.

## TDD e verificação

Os ciclos RED→GREEN registraram `405` na listagem de solicitações, `404` na decisão e na consulta autorizada, rejeição do novo tipo de step-up e ausência dos controles de concessão no frontend. Os ciclos seguintes cobriram recusa, concessão, prazo, escopo explícito, TOTP, IDOR, troca de paciente, acesso cruzado, categoria incorreta, operação incorreta, expiração e respostas equivalentes para identificadores negados.

| Suíte | Cobertura desta issue                                                                                |
| ----- | ---------------------------------------------------------------------------------------------------- |
| TS02  | decisão concorrente protegida por bloqueio de linha e confirmação TOTP vinculada à sessão e à ação;  |
| TS03  | IDOR, acesso cruzado, propriedade da decisão, papel e conhecimento de identificador sem autorização; |
| TS06  | auditoria de decisão, leitura e negação com identificadores pseudonimizados;                         |
| TS08  | concessão acessível, lista, busca, filtro, cartões, detalhe e visão “Compartilhado com”.             |

Em 14 de agosto de 2026, a suíte backend passou com 50 testes e a frontend com 27 testes em sete arquivos. Ruff, formatação, TypeScript, build e consistência Alembic também passaram. No navegador, contas sintéticas confirmaram a autorização nas duas interfaces, o detalhe revalidado, ausência de erro de console e ausência de rolagem horizontal em 390 × 844, 768 × 1024 e 1440 × 900.
