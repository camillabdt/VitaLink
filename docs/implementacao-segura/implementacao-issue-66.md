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

A aprovação anterior permanece válida apenas para `7068e3c`. Ela não comprova o HEAD destinado à `main`.

Na repetição automatizada de 14 de agosto de 2026:

- backend: 86 testes aprovados;
- frontend: 42 testes aprovados e 15 reprovados, de 57.

O gate atual está **pendente**. Primeiro é necessário deixar todas as verificações automatizadas verdes no mesmo HEAD; depois, repetir a revisão visual, funcional e de acessibilidade nas telas alteradas.
