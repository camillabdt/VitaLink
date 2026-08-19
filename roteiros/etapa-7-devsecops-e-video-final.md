# Etapa 7 — DevSecOps

## Estado da etapa

O VitaLink possui aplicação local integrada e pipeline de integração contínua em `.github/workflows/ci.yml`. O workflow é acionado em pushes e pull requests para `develop` e executa serviços de integração, migrações, seed sintético, qualidade, auditoria de dependências, testes e build.

O pipeline atual é **CI**. A primeira versão não inclui implantação automatizada, scanner dedicado de segredos, SAST dedicado, DAST do VitaLink ou monitoramento operacional das regras D01–D08.

## Pipeline versionado

| Fase                   | Evidência atual                                            | Estado             |
| ---------------------- | ---------------------------------------------------------- | ------------------ |
| Serviços de integração | PostgreSQL, Mailpit, MinIO e ClamAV iniciados pelo Compose | Implementado no CI |
| Banco de dados         | Migrações Alembic e seed sintético idempotente             | Implementado no CI |
| Qualidade backend      | Ruff format e lint                                         | Implementado no CI |
| Dependências Python    | `pip-audit`                                                | Implementado no CI |
| Testes backend         | `pytest` com serviços reais                                | Implementado no CI |
| Qualidade frontend     | `oxfmt --check`                                            | Implementado no CI |
| Dependências Node      | `pnpm audit --prod --audit-level high`                     | Implementado no CI |
| Testes frontend        | Vitest                                                     | Implementado no CI |
| Build frontend         | Vite build de produção                                     | Implementado no CI |

## Gates para promoção à `main`

A versão candidata não deve ser promovida enquanto ocorrer uma destas condições:

1. suíte obrigatória reprovada;
2. migração inconsistente ou seed não idempotente;
3. falha de autorização entre usuários, pacientes, recursos ou operações;
4. autorização revogada ou expirada ainda aceita;
5. segredo, credencial ou dado médico real versionado;
6. vulnerabilidade crítica de dependência sem triagem;
7. build de produção reprovado;
8. documentação de segurança incompatível com o código;
9. decisão humana de promoção não vinculada ao conteúdo executável candidato.

Em 14 de agosto de 2026, o workflow [CI #31839376826](https://github.com/camillabdt/VitaLink/actions/runs/31839376826) aprovou o conteúdo executável de `b80f410`: 86 testes backend, 57 testes frontend, migrações, seed, formatação, auditorias de dependências e build. Na mesma data, a responsável autorizou explicitamente a promoção desse conteúdo para `main`. O commit documental posterior apenas registra a evidência e deve manter a mesma implementação.

## Evidência prática disponível

A [Etapa 5](../docs/implementacao-segura/etapa5-verificacao-de-seguranca.md) registra:

- testes automatizados da aplicação;
- evidências históricas das issues #50 a #66;
- relatório HTML e JSON do OWASP ZAP;
- análise dos alertas observados no OWASP Juice Shop.

Os relatórios do ZAP demonstram o processo didático de verificação. Eles não são resultado de segurança do VitaLink. O DAST deverá ser repetido contra uma implantação controlada do sistema.

## Correspondência entre as etapas

| Etapa | Tema                             | Artefato principal                                                                          |
| ----- | -------------------------------- | ------------------------------------------------------------------------------------------- |
| 1     | Ameaças, STRIDE e casos de abuso | [Modelagem](../docs/etapa1-modelagem-de-ameacas.md)                                         |
| 2     | Avaliação e tratamento de riscos | [Registro de riscos](../docs/etapa2-riscos-e-tratamento.md)                                 |
| 3     | Arquitetura segura               | [Requisitos e decisões](../docs/etapa3-arquitetura-segura.md)                               |
| 4     | Código seguro                    | [Práticas e evidências](../docs/implementacao-segura/etapa4-codigo-seguro.md)               |
| 5     | Verificação                      | [Verificação de segurança](../docs/implementacao-segura/etapa5-verificacao-de-seguranca.md) |
| 6     | Detecção e resposta              | [Monitoramento](etapa-6-deteccao-de-intrusoes.md)                                           |
| 7     | DevSecOps e apresentação         | Este documento e `.github/workflows/ci.yml`                                                 |
