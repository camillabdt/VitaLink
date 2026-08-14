# Evidência histórica da issue #66 — fidelidade, acessibilidade e cobertura

## Escopo da revisão realizada

Em 14 de agosto de 2026, a revisão HITL aprovou a versão existente no commit `7068e3c`. Foram avaliados os componentes e destinos concluídos pelas issues #50 a #65, nos viewports de 390 × 844, 768 × 1024 e 1440 × 900, com critérios de funcionalidade, responsividade e acessibilidade.

O workflow `CI/quality` daquele commit executou formatação, Ruff, auditoria Python, 86 testes backend, formatação e auditoria Node, 56 testes frontend e build de produção.

## Alterações posteriores

Esta evidência deixou de ser um gate final após mudanças funcionais posteriores, incluindo:

- página independente de mensagens profissionais no commit `c686e68`;
- adequação das telas de pacientes e do rótulo “Valores de Referência” no commit `7c942b2`;
- alterações documentais e de diagramas posteriores ao commit revisado.

## Estado atual

A aprovação visual anterior permanece vinculada a `7068e3c`. Para a candidata posterior, o workflow [CI #31839376826](https://github.com/camillabdt/VitaLink/actions/runs/31839376826) validou o conteúdo executável de `b80f410` com:

- backend: 86 testes aprovados, com 1 aviso;
- frontend: 57 testes aprovados;
- migrações, seed, formatação, auditorias de dependências e build aprovados.

Em 14 de agosto de 2026, após a apresentação dessas limitações, a responsável autorizou explicitamente ajustar a documentação e promover a candidata para `main`. A decisão humana fica vinculada ao conteúdo executável de `b80f410`; o commit posterior modifica apenas a evidência documental.

Uma nova inspeção pelo navegador integrado foi tentada no ambiente local, mas a ferramenta ficou indisponível antes da navegação. Por isso, não são atribuídas novas capturas ou uma repetição visual que não ocorreu. O gate final registra separadamente a aprovação visual histórica, a validação automatizada atual e a decisão humana explícita de publicação.
