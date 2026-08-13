# Evidências do repositório e participação

## Escopo da revisão

Este documento registra evidências observáveis no histórico do projeto VitaLink até 13 de agosto de 2026.

A revisão considera os arquivos versionados, o histórico Git e contribuições integradas ao repositório. A existência de autoria ou de um artefato não substitui a avaliação da qualidade da contribuição realizada por cada integrante.

## Evidências documentais

| Item                                 | Evidência                                                                                                                       | Situação                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Documentação de segurança            | O diretório `docs/` contém escopo, ativos, perfis, ameaças, casos de abuso, riscos e artefatos das etapas do trabalho.          | Presente                                    |
| Modelagem STRIDE                     | A Etapa 1 consolida T01–T15 e sua relação com ativos e casos de abuso.                                                          | Presente                                    |
| Registro de riscos                   | A Etapa 2 consolida R01–R15, tratamento proposto, NIST CSF 2.0 e estimativas de risco residual.                                 | Presente                                    |
| Arquitetura segura                   | Há documentação de requisitos e decisões arquiteturais e uma fonte Mermaid em `docs/diagramas/arquitetura-segura.mmd`.          | Presente como proposta                      |
| Frontend de referência               | `VitaLink Health Management App/` contém o protótipo executável exportado do Figma Make, com dados e interações simulados.      | Presente como referência visual e funcional |
| Implementação executável do VitaLink | Não foi identificado backend nem integração persistente dos fluxos do sistema.                                                  | Ausente                                     |
| Testes automatizados do VitaLink     | Não foram identificados testes executáveis da aplicação entre os artefatos atuais da entrega.                                   | Ausente                                     |
| Verificação prática de segurança     | A Etapa 5 contém relatórios reais do OWASP ZAP executado contra o OWASP Juice Shop; não são evidência de segurança do VitaLink. | Presente em ambiente didático               |
| Pipeline de CI/CD                    | Ainda não há pipeline executável versionado para o VitaLink.                                                                    | Pendente                                    |
| Vídeo final                          | A evidência do vídeo final ainda deverá ser registrada quando a entrega audiovisual estiver concluída.                          | Pendente                                    |

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
- As evidências de verificação prática, pipeline e vídeo devem ser atualizadas quando essas atividades forem efetivamente realizadas.
