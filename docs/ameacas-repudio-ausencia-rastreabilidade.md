# Ameaças de repúdio e ausência de rastreabilidade

Este documento analisa a ameaça de negação de ações realizadas sobre documentos médicos no VitaLink, correspondente à ameaça T09 da Issue #8 e à categoria **Repudiation** do STRIDE.

## Escopo da análise

São considerados os registros de auditoria e o histórico de versões necessários para identificar o autor, o momento e o conteúdo de operações de criação, alteração e exclusão.

Os pontos de interação utilizados nesta análise estão consolidados na documentação atual do VitaLink. Para T09, são considerados principalmente a API (A09), o banco de dados (A10), os registros de auditoria (A08) e o servidor da aplicação (A11).

## Ameaça identificada

| ID  | Categoria STRIDE | Componente ou ativo                                           | Ameaça concreta                                                                                                                                                                                                             | Impacto e ativos afetados                                                                                                                                                                                            |
| --- | ---------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T09 | Repudiation      | Registros de auditoria, histórico de versões e A08, A09 e A10 | Uma pessoa cria, altera ou exclui um registro e depois nega a ação porque o sistema não registrou evidências suficientes ou porque os registros de auditoria puderam ser apagados, alterados ou associados ao autor errado. | Pacientes e equipe não conseguem atribuir a operação ao responsável nem reconstruir o incidente. Isso prejudica a responsabilização, a correção do prontuário, a investigação e a confiança nas informações médicas. |

## T09 — Negação de uma alteração realizada

**Ator:** paciente, profissional de saúde, usuário privilegiado futuro ou atacante que realizou uma operação em uma conta comprometida.

**Objetivo:** negar a autoria de uma criação, alteração ou exclusão e impedir que o evento seja atribuído ao responsável.

**Sequência possível:**

1. O ator cria, altera ou exclui uma informação médica.
2. O sistema não registra autor, data e hora, tipo da operação, recurso afetado e versão anterior, ou registra esses dados sem proteção contra alteração.
3. O ator nega ter realizado a operação ou modifica os próprios registros de auditoria.
4. A equipe tenta reconstruir o ocorrido, mas não encontra evidências confiáveis que relacionem a ação a uma identidade e sessão.
5. A autoria e a sequência dos fatos permanecem inconclusivas.

**Condição que favorece a ameaça:** logs incompletos, compartilhamento de contas, identidade de sessão não vinculada ao evento, relógios inconsistentes, ausência de histórico de versões ou possibilidade de alterar e excluir os próprios registros de auditoria.

**Ativos afetados:** A03 a A05 (conteúdo médico discutido), A08 (registros de auditoria), A09 (API) e A10 (banco de dados).

**Impacto sobre a rastreabilidade:** o VitaLink perde a capacidade de demonstrar quem fez o quê e quando. Isso impede corrigir o histórico com segurança, responsabilizar o autor e distinguir erro, fraude e comprometimento de conta.

**Caso de abuso relacionado:** `CA06 — Exclusão de registro para ocultar uma ação`, consolidado na Etapa 1.

## Evidências necessárias para rastreabilidade

Para que uma ação possa ser investigada, o registro de auditoria deve permitir relacionar, no mínimo:

- a identidade e o perfil que realizaram a operação;
- a sessão ou contexto autenticado usado;
- a data e a hora do evento;
- o tipo de operação: criação, alteração ou exclusão;
- o recurso e o paciente afetados;
- o resultado da operação, inclusive tentativas negadas;
- a versão anterior e a nova versão quando houver alteração;
- a origem ou o ponto de interação relevante, conforme os pontos de interação documentados para o sistema.

O histórico de versões e o registro de auditoria têm funções diferentes: o primeiro permite comparar e recuperar o conteúdo; o segundo atribui eventos a identidades e contextos. A ausência de um deles reduz a capacidade de detectar adulteração ou contestar uma negação de autoria.

## Rastreabilidade

| Ameaça | Categoria   | Caso de abuso | Ativos principais         | Risco posterior                            |
| ------ | ----------- | ------------- | ------------------------- | ------------------------------------------ |
| T09    | Repudiation | CA06          | A03 a A05, A08, A09 e A10 | R09 — ação não pode ser atribuída ao autor |

O caso de abuso CA06 está consolidado na Etapa 1, e o risco R09 está registrado e avaliado na Etapa 2.
