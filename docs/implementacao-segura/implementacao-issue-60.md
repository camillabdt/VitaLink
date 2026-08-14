# Implementação da issue #60 — registros profissionais

## Estado e limite da entrega

Esta fatia permite ao profissional registrar e corrigir consultas realizadas, anotações e recomendações. Consulta não cria agenda. Recomendação não representa receita ou diagnóstico. Receita permanece somente como categoria de documento anexado.

## Jornada executável

1. `POST /api/v1/step-up-confirmations` confirma o TOTP para a ação `clinical_record_create`.
2. `POST /api/v1/professional-records` consome a confirmação de uso único e exige `anexar` na categoria `consultas` ou `recomendações`.
3. `GET /api/v1/professional-records` lista somente versões atuais: o paciente lê os próprios registros e o profissional recebe apenas categorias com autorização vigente para `consultar`.
4. `PATCH /api/v1/professional-records/{id}` exige o autor original, autorização vigente para `atualizar`, motivo e versão esperada.
5. A correção marca a versão anterior como histórica e cria uma sucessora ligada por `replaces_id`, sem alterar autoria, tipo ou origem.

## Controles verificáveis

- TOTP de uso único na criação e vínculo da confirmação à conta, sessão e ação;
- categorias separadas para consultas/anotações e recomendações;
- somente o profissional autor corrige; o paciente consulta sem poder alterar;
- revogação bloqueia a leitura e a correção seguintes na sessão já aberta;
- IDOR, escopo insuficiente, TOTP ausente ou reutilizado e versão obsoleta são negados;
- conteúdo, justificativa, data com fuso e motivo de correção possuem limites e validação;
- auditoria registra tipo, versão, resultado e correlação sem conteúdo clínico ou justificativa.

## Interface conectada

`ProfessionalRecords` é compartilhado pelo detalhe do paciente autorizado e pelas abas “Histórico” e “Recomendações” do paciente. O profissional publica após TOTP, corrige com motivo e anexa documentos pelo fluxo privado existente. O paciente recebe a mesma versão persistida sem controles de escrita.

O `DoctorDashboard` legado foi removido. Com ele saíram dados simulados, ligação, agenda, assinatura, passkey fictícia, ICP-Brasil fictícia e temporizadores. O arquivo mantém somente o dashboard autorizado e persistido.

## TDD e verificação

Os ciclos RED→GREEN começaram pela ação TOTP ainda inválida (`422`), seguiram por listagem ausente (`405`) e correção ausente (`405`). Os testes públicos passaram a cobrir criação, listagem para ambos os perfis, correção versionada, leitura sem alteração pelo paciente, recomendação não prescritiva, validação, TOTP de uso único, IDOR, revogação e auditoria sem conteúdo.

| Suíte | Cobertura desta issue                                                                     |
| ----- | ----------------------------------------------------------------------------------------- |
| TS03  | categoria/operação, paciente somente leitura, IDOR e revogação imediata;                  |
| TS04  | autoria, origem, motivo, conflito de versão e preservação do original;                    |
| TS06  | criação, listagem, correção e negações auditadas sem conteúdo clínico;                    |
| TS08  | carregamento, vazio, publicação com TOTP, correção, falha e sessão expirada na interface. |

Em 14 de agosto de 2026, a validação final executou Ruff, a suíte backend acumulada, consistência Alembic, TypeScript, 42 testes frontend em onze arquivos, formatação e build de produção.
