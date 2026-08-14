# Etapa 7 — DevSecOps e roteiro do vídeo final

## Estado da etapa

O VitaLink possui aplicação local integrada e pipeline de integração contínua em `.github/workflows/ci.yml`. O workflow é acionado em pushes e pull requests para `develop` e executa serviços de integração, migrações, seed sintético, qualidade, auditoria de dependências, testes e build.

O pipeline atual é **CI**, não entrega contínua completa: não há implantação automatizada, verificação de segredos, SAST dedicado, DAST do VitaLink nem ativação das regras D01–D08. O vídeo final permanece pendente.

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
| Segredos               | Scanner dedicado e bloqueio por achado                     | Pendente           |
| SAST                   | Scanner estático de segurança dedicado                     | Pendente           |
| DAST do VitaLink       | Execução contra implantação controlada                     | Pendente           |
| Entrega                | Publicação ou implantação automatizada                     | Pendente           |
| Monitoramento          | Correlação e alertas D01–D08                               | Pendente           |

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
9. revisão HITL anterior ao HEAD candidato.

Em 14 de agosto de 2026, a execução local do HEAD não satisfez o primeiro gate: o backend terminou com 86 testes aprovados, mas o frontend terminou com 42 testes aprovados e 15 reprovados, de 57. O sucesso histórico do workflow não substitui essa validação atual.

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

# Roteiro do vídeo final

## Situação

**Estado atual: pendente de gravação e publicação.**

O vídeo deve apresentar o estado real: aplicação local integrada e CI existente, sem afirmar implantação de produção, DAST do VitaLink ou monitoramento ativo.

## Duração e estrutura sugeridas

Duração alvo: **8 a 10 minutos**.

| Tempo      | Bloco         | Conteúdo                                                     |
| ---------- | ------------- | ------------------------------------------------------------ |
| 0:00–0:45  | Abertura      | Problema, objetivo, atores e escopo acadêmico                |
| 0:45–1:45  | Modelagem     | Ativos, STRIDE e exemplos de CA01–CA10                       |
| 1:45–2:45  | Riscos        | Método, riscos prioritários e residual estimado              |
| 2:45–3:45  | Arquitetura   | Cliente, API, banco, armazenamento e fronteiras              |
| 3:45–5:15  | Implementação | Autenticação, autorização, documentos, auditoria e mensagens |
| 5:15–6:30  | Verificação   | Testes atuais e ZAP didático, com suas limitações            |
| 6:30–7:30  | Detecção      | Eventos implementados e regras D01–D08 pendentes             |
| 7:30–8:45  | DevSecOps     | Workflow atual, gates e lacunas de CD/SAST/DAST              |
| 8:45–10:00 | Encerramento  | Limitações, participação e próximos passos                   |

## Demonstração recomendada

1. subir o ambiente local com Docker Compose;
2. demonstrar autorização e revogação sem dados reais;
3. demonstrar uma tela de paciente e a rota de mensagens profissionais;
4. mostrar a execução dos testes e o workflow de CI;
5. abrir o relatório do ZAP esclarecendo que o alvo foi o Juice Shop;
6. mostrar as regras D01–D08 como trabalho de monitoramento ainda pendente.

## Checklist antes de gravar

- [ ] Todas as alterações finais estão integradas à branch candidata.
- [ ] Backend, frontend, formatação, auditorias e build estão verdes no mesmo HEAD.
- [ ] Links internos e diagramas foram conferidos.
- [ ] Nenhum segredo ou dado médico real está versionado.
- [ ] O gate HITL foi repetido sobre o HEAD candidato.
- [ ] O ZAP do Juice Shop não é apresentado como DAST do VitaLink.
- [ ] Eventos de auditoria não são apresentados como alertas D01–D08 ativos.
- [ ] O link do vídeo é registrado somente depois da publicação.

## Evidência do vídeo

Quando o vídeo for publicado, preencher:

```text
Título:
Plataforma:
URL:
Data de publicação:
Duração:
```

## Limitações atuais

- a aplicação é executável localmente, mas não há implantação de produção comprovada;
- a suíte frontend local de 14/08/2026 não ficou verde;
- o DAST versionado teve o Juice Shop como alvo;
- não há CD, scanner dedicado de segredos, SAST dedicado ou alertas D01–D08;
- o vídeo ainda depende de gravação e publicação.
