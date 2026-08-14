# Implementação da issue #54 — solicitação por código temporário

## Estado e limite da entrega

Esta fatia conecta a geração, listagem, cópia, revogação e consumo de códigos temporários à API e ao PostgreSQL. O consumo cria uma solicitação pendente e uma notificação interna, mas não cria autorização nem libera dado clínico. A decisão do paciente pertence à issue #55 e a caixa de notificações, à issue #64.

## Jornada executável

1. Paciente autenticado usa `POST /api/v1/access-codes` para gerar um código aleatório retornado em texto somente nessa resposta.
2. `GET /api/v1/access-codes` lista apenas identificador, datas e estado. O texto do código não pode ser recuperado do banco.
3. Paciente pode revogar o próprio código ativo em `DELETE /api/v1/access-codes/{id}`.
4. Profissional aprovado informa código e justificativa em `POST /api/v1/access-requests`.
5. O servidor bloqueia a linha do código, confirma validade e uso único, registra a solicitação como `pending`, cria a notificação do paciente e consome o código na mesma transação.
6. A resposta confirma somente o nome do paciente e o estado pendente. Código inválido, expirado, consumido ou revogado recebe a mesma negação sem dado do paciente.

## Controles verificáveis

- código produzido com fonte criptográfica, 32 caracteres, validade exata de 24 horas e armazenamento somente como HMAC-SHA-256;
- somente o paciente proprietário gera, lista e revoga; troca de identificador recebe resposta de recurso inexistente;
- somente profissional aprovado consome o código em nome da própria conta;
- consumo concorrente permite um único `201`; a outra requisição recebe negação genérica;
- solicitação pendente não cria autorização nem acesso clínico;
- auditoria registra criação, revogação, consumo, solicitação, sucesso e negações sem código, nome, CPF, e-mail ou justificativa;
- busca simulada por nome ou CPF foi removida do fluxo “Novo paciente”.

## TDD e verificação

Os ciclos RED→GREEN registraram `404` na criação e no consumo, `405` na listagem e ausência dos controles acessíveis de código no frontend. Os ciclos seguintes cobriram revogação, IDOR, estados inativos, papéis trocados, persistência, auditoria, concorrência e respostas da interface.

| Suíte | Cobertura desta issue                                                                  |
| ----- | -------------------------------------------------------------------------------------- |
| TS03  | propriedade do código, papéis, IDOR, validade, uso único e consumo concorrente;        |
| TS06  | sucesso e negação auditados, notificação persistida e ausência de valores sensíveis;   |
| TS08  | geração, cópia, listagem, revogação e solicitação acessíveis sem busca por identidade. |

Em 14 de agosto de 2026, a suíte backend passou com 41 testes e a frontend com 25 testes em sete arquivos. Ruff, formatação, TypeScript, build e auditoria de dependências também passaram. No navegador, o fluxo real confirmou geração, cópia, consumo e estado persistido, sem busca por nome/CPF, sem erro de console e sem rolagem horizontal em 390 × 844, 768 × 1024 e 1440 × 900.
