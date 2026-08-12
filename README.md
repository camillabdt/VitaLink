<div align="center">

<img src="imagens/logo.png" alt="Logo do VitaLink" width="620">

# VitaLink

_Sua saúde. Seus dados. Seu controle._

</div>

## Escopo e estado atual

O VitaLink é uma proposta acadêmica de sistema para gerenciamento seguro de informações médicas. Pacientes mantêm o próprio histórico e decidem quando profissionais de saúde podem acessá-lo. O repositório contém a análise e o planejamento de segurança. Ele **não contém uma implementação executável do sistema, pipeline, testes de segurança ou verificação de segurança real**.

Nesta documentação, os termos têm significado explícito:

- **Estado atual:** artefato ou evidência presente no repositório.
- **Proposto:** requisito, controle ou decisão planejada, ainda sem comprovação de implementação.
- **Evidência:** saída, teste, relatório ou outro artefato reproduzível versionado.
- **[A confirmar]:** informação ainda não documentada ou não validável.

## Perfis e ativos principais

| Perfil | Papel documentado |
| --- | --- |
| Paciente | Mantém dados próprios, compartilha informações e concede ou revoga acesso. |
| Profissional de Saúde | Solicita acesso e atua apenas no escopo de autorização ativa. |
| Administrador ou Suporte | Fora do escopo atual; não recebe permissão. |

Os ativos incluem dados pessoais (A01–A02), dados e documentos médicos (A03–A05 e A12), credenciais e tokens (A06–A07), auditoria (A08) e componentes internos (A09–A11). Consulte o [inventário](docs/inventario-de-ativos.md) e a [classificação CIA](docs/classificacao-cia-dos-ativos.md).

## Navegação por etapa

| Etapa | Status documental | Artefatos locais |
| --- | --- | --- |
| Base | Documentada | [Perfis e permissões](docs/usuarios-perfis-e-permissoes.md), [autorização e revogação](docs/fluxo-autorizacao-revogacao.md) |
| 1. Ameaças e casos de abuso | Documentada, com lacunas de implementação marcadas | [Índice STRIDE e casos de abuso](docs/etapa1-modelagem-de-ameacas.md), [identidade](docs/ameacas-identidade-autenticacao-privilegios.md), [consentimento](docs/ameacas-consentimento-acesso-indevido.md), [disponibilidade](docs/ameacas-disponibilidade.md) |
| 2. Riscos e NIST CSF 2.0 | Planejada e documentada; residual apenas estimado | [Critérios](docs/etapa2-criterios-e-risco-residual.md), [registro e tratamento](docs/etapa2-riscos-e-tratamento.md) |
| 3. Arquitetura segura | Proposta; sem implementação verificável | [Requisitos e decisões](docs/etapa3-arquitetura-segura.md), [diagrama-fonte Mermaid](docs/diagramas/arquitetura-segura.mmd) |
| 4. Código seguro | Pendente de código e evidência executável | [Registro da lacuna](docs/etapa4-codigo-seguro.md) |
| 5. Verificação de segurança | Pendente de execução real e relatório | [Registro da lacuna](docs/etapa5-verificacao-de-seguranca.md) |
| 6. Resposta e detecção | Roteiro e regras propostos; sem monitoramento ativo | [Resposta e detecção](docs/etapa6-resposta-e-deteccao.md) |
| 7. Pipeline e vídeo | Roteiros propostos; sem pipeline ou vídeo encontrado | [Pipeline e vídeo](docs/etapa7-pipeline-e-video.md) |

## Rastreabilidade central

Os identificadores estáveis são `Axx` (ativos), `Txx` (ameaças), `CAxx` (casos de abuso), `Rxx` (riscos), `RSxx` (requisitos), `Vxx` (vulnerabilidades candidatas), `DAxx` (decisões arquiteturais) e `Dxx` (regras de detecção). A [Etapa 1](docs/etapa1-modelagem-de-ameacas.md) liga ativos, ameaças e abusos. A [Etapa 2](docs/etapa2-riscos-e-tratamento.md) liga ameaças, riscos, NIST CSF 2.0, controles propostos, responsáveis propostos e verificação necessária. A [Etapa 3](docs/etapa3-arquitetura-segura.md) liga riscos a requisitos, vulnerabilidades candidatas e decisões.

As decisões de escopo, autorização, sessão, auditoria e detecção estão em [decisões de segurança propostas](docs/decisoes-de-seguranca.md).

## Evidências e participação

A [auditoria de evidências do repositório](docs/evidencias-repositorio.md) registra o que foi encontrado no histórico Git e o que ainda não pode ser comprovado. Ela não substitui a conferência no GitHub após o push.

## Integrantes

- Amanda Dias
- Camilla Borchhardt
- Luiza Figueiredo
- Milena Castro
- Rafela Nunes
- Tauani Sauceda

O histórico local contém autoria associada a Amanda, Camilla, Luiza, Milena e Tauani. A ausência de contribuição identificada para Rafela e a associação entre identidades de autoria estão registradas como **[A confirmar]** em [evidências](docs/evidencias-repositorio.md).

## Ambiente local

O projeto declara Python 3.12 e `uv` em [pyproject.toml](pyproject.toml). Não há aplicação executável definida. Quando houver código, execute os comandos definidos pelo próprio projeto com `uv run` e versionem as evidências necessárias.
