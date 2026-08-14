# Evidências do repositório e participação

## Escopo da revisão

Este documento registra evidências observáveis no histórico e no working tree do projeto VitaLink até 14 de agosto de 2026.

A revisão considera os arquivos versionados, o histórico Git e contribuições integradas ao repositório. A existência de autoria ou de um artefato não substitui a avaliação da qualidade da contribuição realizada por cada integrante.

## Evidências documentais

| Item                                 | Evidência                                                                                                                                                                                                       | Situação                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Documentação de segurança            | O diretório `docs/` contém escopo, ativos, perfis, ameaças, casos de abuso, riscos e artefatos das etapas do trabalho.                                                                                          | Presente                                         |
| Modelagem STRIDE                     | A Etapa 1 consolida T01–T15 e sua relação com ativos e casos de abuso.                                                                                                                                          | Presente                                         |
| Registro de riscos                   | A Etapa 2 consolida R01–R15, tratamento proposto, NIST CSF 2.0 e estimativas de risco residual.                                                                                                                 | Presente                                         |
| Arquitetura segura                   | Há requisitos e decisões, diagramas versionados e implementação local de API, banco, armazenamento privado, auditoria e frontend integrado.                                                                     | Presente; implantação de produção não comprovada |
| Frontend                             | `VitaLink Health Management App/` contém a aplicação React integrada à API nos fluxos documentados. Partes do painel do paciente ainda usam `mockData.ts` em runtime.                                           | Parcial; migração dos dados estáticos pendente   |
| Implementação executável do VitaLink | `src/vitallink/`, migrações Alembic, `compose.yaml` e o frontend formam uma aplicação local integrada.                                                                                                          | Presente                                         |
| Testes automatizados do VitaLink     | `tests/` cobre o backend e dezesseis arquivos `*.test.tsx` cobrem o frontend. O CI do commit `ac44643` aprovou 86 testes backend e 57 frontend; a execução frontend local concorrente apresentou instabilidade. | Presente; CI atual verde                         |
| Verificação prática de segurança     | Há testes de autorização, sessão, auditoria, documentos e limites; o ZAP versionado analisou o OWASP Juice Shop, não o VitaLink.                                                                                | Parcial; DAST do VitaLink pendente               |
| Pipeline de CI/CD                    | `.github/workflows/ci.yml` executa serviços reais, migrações, seed, Ruff, `pip-audit`, pytest, formatação, `pnpm audit`, testes e build em `develop`. Não há implantação automatizada.                          | CI presente; CD pendente                         |
| Vídeo final                          | A evidência do vídeo final ainda deverá ser registrada quando a entrega audiovisual estiver concluída.                                                                                                          | Pendente                                         |

## Participação identificada

| Integrante         | Identidade observada no histórico/repositório | Situação                                                |
| ------------------ | --------------------------------------------- | ------------------------------------------------------- |
| Amanda Dias        | `amandadiasdev` / Amanda Dias                 | Contribuição identificada                               |
| Camilla Borchhardt | `camillabdt` / Camilla Borchhardt             | Contribuição identificada                               |
| Luiza Figueiredo   | `Luizavfig` / `luizavfig`                     | Contribuição identificada                               |
| Milena Castro      | `MilenaCastroo`                               | Contribuição identificada                               |
| Rafaela Nunes      | `rafaelapnunes`                               | Contribuição identificada; PR #40 integrado à `develop` |
| Tauani Sauceda     | Tauani Sauceda                                | Contribuição identificada                               |

O histórico pode apresentar variações de nome ou e-mail para uma mesma pessoa. Essas diferenças de assinatura Git não devem ser interpretadas como ausência de contribuição quando a autoria correspondente pode ser relacionada ao integrante.

## Limitações da evidência

- Commits, pull requests e arquivos demonstram participação versionada, mas não medem isoladamente a qualidade ou a relevância acadêmica da contribuição.
- Controles descritos como propostos não devem ser apresentados como implementados sem código, teste ou evidência técnica correspondente.
- Artefatos que estejam somente em branches ou pull requests ainda não integrados não são considerados parte da versão consolidada da `develop`.
- O CI verde do HEAD atual não substitui a revisão HITL nem as evidências complementares ainda pendentes.
- DAST do VitaLink, correlação D01–D08, implantação automatizada e vídeo devem ser registrados somente quando efetivamente realizados.
