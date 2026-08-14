# Implementação da issue #52 — cadastro e validação profissional

## Estado e limite da entrega

Esta fatia conecta o cadastro, a confirmação, a ativação TOTP, a validação manual e o login do profissional à API e ao PostgreSQL. A validação usa um comando local auditado. Não existe perfil administrativo, painel público nem acesso do operador a dados clínicos.

A entrega usa somente dados sintéticos. Consulta automática a conselho profissional continua fora do escopo. Solicitação de acesso a paciente pertence à issue #54.

## Jornada executável

1. `POST /api/v1/professional-registrations` recebe nome, e-mail, CPF, nascimento, telefone, senha, CRM, UF, especialidade e instituição opcional.
2. E-mail, CPF e par CRM/UF são únicos. Repetições recebem a mesma resposta genérica e não revelam qual identidade já existe.
3. O fluxo existente confirma o e-mail e cadastra TOTP, mas mantém a conta em `pending_validation`.
4. `python -m vitallink.professional_validation` exige CRM, UF, operador, decisão e justificativa. Somente a transição pendente para aprovada ou rejeitada é aceita.
5. Repetir exatamente a mesma decisão é idempotente. Decisões conflitantes são negadas e auditadas.
6. Profissional pendente ou rejeitado não recebe sessão. Profissional aprovado entra com senha e TOTP.
7. Recuperação total continua retornando o profissional à validação manual, sem link automático.

Exemplo local com identidade sintética:

```bash
uv run python -m vitallink.professional_validation \
  --crm CRM-SINTETICO \
  --uf RS \
  --operator operador-local-01 \
  --decision approved \
  --justification "Registro sintético conferido no ambiente acadêmico."
```

## Controles verificáveis

- senha com Argon2id e política compartilhada com o cadastro do paciente;
- TOTP obrigatório e segredo cifrado em repouso;
- CPF e identificadores de validação não aparecem na saída do comando;
- operador e alvo são pseudonimizados na auditoria;
- justificativa permanece no registro profissional e não é copiada para metadados de auditoria;
- bloqueio transacional impede decisões concorrentes incompatíveis;
- restrições únicas no PostgreSQL protegem e-mail, CPF e CRM/UF;
- frontend usa os formulários existentes e decide a rota autenticada pelo perfil retornado por `GET /api/v1/me`.

## TDD e verificação

Os ciclos RED→GREEN cobrem cadastro anti-enumeração, pendência após TOTP, aprovação idempotente, rejeição terminal, login por estado e mensagens do frontend. As suítes acumuladas também preservam recuperação manual do profissional, autenticação do paciente, sessões e auditoria append-only.

| Suíte | Cobertura desta issue                                                                         |
| ----- | --------------------------------------------------------------------------------------------- |
| TS01  | cadastro, confirmação, TOTP, estados pendente/rejeitado/aprovado e limitação de autenticação; |
| TS02  | emissão de sessão somente após aprovação;                                                     |
| TS03  | unicidade de CPF e CRM/UF no banco;                                                           |
| TS06  | decisões, negações, correlação e identificadores pseudônimos;                                 |
| TS08  | seleção de perfil, formulário real, mensagens de estado e rota baseada na API.                |

Os resultados locais devem ser reproduzidos com `uv run pytest`, `ruff format --check`, `ruff check`, `pip-audit`, `pnpm format:check`, `pnpm audit`, `pnpm test` e `pnpm build`.
