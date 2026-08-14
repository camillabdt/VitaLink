# Implementação da issue #50 — cadastro e login seguro do paciente

## Estado e limite da entrega

Esta é a primeira fatia vertical executável do VitaLink. A entrega conecta o frontend local à API para cadastro do paciente, confirmação de e-mail, ativação TOTP, exibição única de material de recuperação, login, consulta da sessão e logout.

A evidência desta issue não autoriza dados reais e não torna funcionais as demais telas da base inicial. Recuperação de conta pertence à issue #51; cadastro e login profissional pertencem à issue #52. Enquanto essas fatias não forem implementadas, os respectivos controles não são exibidos nos formulários conectados por esta entrega.

## Componentes entregues

| Camada        | Implementação                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Entrada HTTPS | Caddy com TLS local, cabeçalhos de segurança, arquivos estáticos e proxy de `/api/*`                                                  |
| Interface     | `LoginPage.tsx`, `RegisterPage.tsx` e logout de `App.tsx`, preservando cores, tipografia, composição e responsividade da base inicial |
| API           | FastAPI sob `/api/v1`, validação de entrada, respostas sanitizadas e identificador de correlação                                      |
| Persistência  | PostgreSQL 17 e migração Alembic inicial versionada                                                                                   |
| E-mail        | confirmação capturada exclusivamente pelo Mailpit local                                                                               |
| Auditoria     | eventos atômicos de sucesso e negação, identificadores pseudônimos e trigger append-only no PostgreSQL                                |
| Operação      | Docker Compose, health checks, seed sintético idempotente e workflow inicial de CI                                                    |

## Fluxo funcional

1. O paciente envia nome, e-mail, CPF, nascimento, telefone, senha e tipo sanguíneo.
2. A API valida os dados, usa Argon2id para a senha e responde de forma idêntica para cadastro novo ou duplicado.
3. Um código numérico de uso único e validade de 15 minutos é armazenado apenas como HMAC e enviado ao Mailpit.
4. A confirmação cria uma sessão opaca restrita à ativação TOTP por 15 minutos.
5. O frontend apresenta a chave para cadastramento manual no aplicativo autenticador e confirma o primeiro código.
6. A conta é ativada; dez códigos e uma chave de recuperação offline são exibidos uma vez e persistidos somente como HMAC.
7. O login exige senha e TOTP e cria sessão opaca com limite de 30 minutos de inatividade e oito horas absolutas.
8. O logout exige `Origin` permitido e token CSRF vinculado à sessão, revoga a sessão no servidor e remove o cookie.

## Controles de segurança verificáveis

- cookies `__Host-`, `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/` e sem `Domain`;
- token CSRF derivado e vinculado à sessão, mantido apenas em `sessionStorage` para as escritas autenticadas;
- validação exata de `Origin` além de `SameSite`;
- limitação progressiva por operação, conta pseudônima e origem em login, confirmação de e-mail e confirmação TOTP;
- bloqueio serializado por advisory lock do PostgreSQL para impedir que tentativas concorrentes contornem o limite;
- consumo de código e sessão de ativação protegido por bloqueio de linha;
- erros sem eco de CPF, senha ou detalhes internos;
- log operacional por chamada com rota normalizada, método, resultado, duração e correlação, sem corpo ou parâmetros;
- evento de auditoria na mesma transação da operação de segurança;
- trigger que rejeita `UPDATE` e `DELETE` em `audit_events`;
- nenhum e-mail externo, login social, biometria, passkey, ICP-Brasil ou temporizador simulado.

## Execução local

1. Copie `.env.example` para `.env` e substitua `VITALINK_SECRET_KEY` por um valor aleatório com pelo menos 32 caracteres.
2. Execute `docker compose up --build -d`.
3. Acesse `https://localhost`. O certificado é emitido pela autoridade local do Caddy e deve ser confiado apenas no ambiente de desenvolvimento.
4. Consulte os e-mails capturados em `http://localhost:8025`.
5. Verifique os serviços com `docker compose ps` e a API com `https://localhost/health`.

O PostgreSQL e o Mailpit publicam portas apenas no loopback para testes locais. A API não publica porta no host e recebe tráfego pelo Caddy.

### Seed sintético

O comando abaixo exige credenciais sintéticas explícitas e não as imprime nos logs:

```bash
docker compose exec \
  -e VITALINK_DEMO_PASSWORD='<senha-sintética>' \
  -e VITALINK_DEMO_TOTP_SECRET='<segredo-base32-sintético>' \
  api python -m vitallink.seed_demo
```

O paciente criado é `demo.patient@example.com`. O comando é idempotente e registra `demo.seed.patient` na auditoria. Não use senha, TOTP, CPF, telefone ou e-mail de uma pessoa real.

## TDD e evidências locais

Os ciclos RED foram observados antes da implementação para cadastro, ativação completa, limitação de tentativas, CSRF/`Origin`, logout, logs sanitizados e respostas sem eco de dados. Depois do GREEN, a validação acumulada executada em 13 de agosto de 2026 produziu:

| Verificação                                       | Resultado local                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `uv run pytest -q`                                | 10 testes aprovados                                                               |
| `pnpm test`                                       | 5 testes aprovados                                                                |
| `uv run ruff format --check src tests migrations` | aprovado                                                                          |
| `uv run ruff check src tests migrations`          | aprovado                                                                          |
| `uv run pip-audit`                                | nenhuma vulnerabilidade conhecida encontrada                                      |
| `pnpm exec tsc --noEmit`                          | aprovado                                                                          |
| `pnpm audit --prod --audit-level high`            | nenhuma vulnerabilidade conhecida encontrada                                      |
| `pnpm build`                                      | aprovado, com aviso não bloqueante sobre o tamanho do bundle da aplicação         |
| Build dos containers `api` e `web`                | aprovado                                                                          |
| Pilha Docker limpa                                | PostgreSQL, Mailpit, API e web saudáveis; Caddy respondeu HTTP/2 200 em `/health` |
| Migração limpa                                    | revisão `29c9544a59f0` aplicada e trigger `audit_events_append_only` presente     |
| Seed sintético                                    | criação e segunda execução idempotente aprovadas, sem imprimir credenciais        |
| Jornada HTTPS sintética                           | login 204, sessão 200, logout 204 e reutilização negada 401                       |

O teste backend usa PostgreSQL e Mailpit reais. A verificação da migração cria um banco exclusivamente sintético, aplica a revisão desde zero, comprova a rejeição de mutação da auditoria e remove o banco ao final.

## Rastreabilidade

| Suíte | Cobertura desta issue                                                                   |
| ----- | --------------------------------------------------------------------------------------- |
| TS01  | cadastro, confirmação, TOTP, login, respostas anti-enumeração e limites de tentativa    |
| TS02  | cookie, sessão restrita, sessão completa, CSRF, `Origin`, logout e invalidação          |
| TS06  | correlação, minimização, sucessos/negações e auditoria append-only                      |
| TS08  | formulários acessíveis, estados assíncronos e preservação do padrão visual da aplicação |
| TS10  | lockfiles, análise estática, imagens versionadas, TLS, cabeçalhos, health checks e CI   |

TS01 e TS02 permanecem parciais até as issues de recuperação, reautenticação e autenticação profissional. TS08 permanece parcial até a comparação visual automatizada nos três viewports normativos.
