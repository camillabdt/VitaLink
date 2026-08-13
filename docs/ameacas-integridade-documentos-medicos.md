# Ameaças à integridade de documentos médicos

Este documento analisa ameaças de criação indevida, alteração e exclusão de documentos médicos no VitaLink, correspondentes às ameaças T07 e T08 da Issue #8 e à categoria **Tampering** do STRIDE.

## Escopo da análise

São consideradas as operações de criação, alteração e exclusão de consultas, exames, laudos, receitas, prescrições e imagens médicas.

Os componentes e pontos de interação utilizados nesta análise estão consolidados na documentação atual do VitaLink. Para T07 e T08, são considerados principalmente a API (A09), o banco de dados (A10), o servidor da aplicação (A11) e o armazenamento de documentos (A12).

## Ameaças identificadas

| ID | Categoria STRIDE | Componente ou ativo | Ameaça concreta | Impacto e ativos afetados |
| --- | --- | --- | --- | --- |
| T07 | Tampering | API, banco de dados, armazenamento de documentos e A03, A04, A05, A09, A10 e A12 | Um usuário autenticado ou atacante cria um exame, laudo, receita, prescrição ou consulta falsa, altera um registro existente ou substitui um documento por outro, sem possuir autorização para essa operação. | Um profissional pode interpretar informação falsa ou adulterada como legítima e tomar uma decisão clínica incorreta. O histórico do paciente perde confiabilidade e pode haver repetição de exames, atraso no diagnóstico, uso incorreto de medicamentos ou tratamento inadequado. |
| T08 | Tampering | API, banco de dados, armazenamento de documentos e A03, A04, A05, A09, A10 e A12 | Um usuário autenticado, atacante ou processo indevido exclui uma consulta, um laudo, uma receita ou sua referência no banco para remover informação médica ou ocultar uma ação anterior. | A perda ou ocultação rompe a continuidade do cuidado, dificulta comprovar prescrições e atendimentos e pode deixar profissionais sem informações necessárias. A exclusão pode afetar tanto o arquivo quanto seus metadados e vínculos. |

## T07 — Criação ou alteração indevida de documento ou registro médico

**Ator:** paciente, profissional de saúde ou atacante que obteve acesso a uma conta ou a um ponto de interação do sistema.

**Objetivo:** inserir um exame, laudo, receita, prescrição ou consulta falsa; modificar uma informação médica existente; ou substituir um documento por conteúdo diferente, sem autorização.

**Sequência possível:**

1. O ator acessa uma operação de criação, atualização ou envio de documentos.
2. O ator envia um novo exame, laudo, receita, prescrição ou consulta falsa, ou seleciona o identificador de um registro existente para alterá-lo.
3. A API não verifica de forma suficiente a autoria, o perfil, o paciente, a autorização e a operação solicitada.
4. O conteúdo falso ou adulterado, seus metadados ou sua referência são gravados no banco de dados ou no armazenamento.
5. O VitaLink apresenta a informação criada ou alterada indevidamente como parte legítima do histórico médico.

**Condição que favorece a ameaça:** autorização incompleta por recurso e operação, ausência de validação da autoria e do vínculo com o paciente, confiança em identificadores ou metadados enviados pelo cliente, ausência de validação de integridade ou substituição do conteúdo sem preservar a versão anterior.

**Ativos afetados:** A03 (dados médicos), A04 (exames, laudos e imagens), A05 (receitas e prescrições), A08 (registros de auditoria), A09 (API), A10 (banco de dados) e A12 (armazenamento de documentos).

**Impacto clínico e de confiança:** um resultado, laudo, registro de consulta, receita ou prescrição falso ou adulterado pode orientar diagnóstico, medicamento ou procedimento inadequado. Mesmo quando a irregularidade é descoberta, a falta de evidências sobre a origem ou de uma versão íntegra anterior reduz a confiança no restante do prontuário.

**Caso de abuso relacionado:** `CA05 — Alteração maliciosa de exame`, consolidado na Etapa 1.

## T08 — Exclusão de laudo, receita ou consulta

**Ator:** paciente, profissional de saúde ou atacante com acesso indevido a uma função de exclusão ou ao armazenamento.

**Objetivo:** remover uma informação clínica ou ocultar que um documento ou atendimento existiu.

**Sequência possível:**

1. O ator identifica uma consulta, receita, prescrição, exame ou laudo.
2. O ator solicita sua exclusão ou remove diretamente o arquivo, o registro ou a referência que os relaciona.
3. O sistema executa a operação sem confirmação adequada, sem verificar a permissão aplicável ou sem preservar uma versão recuperável.
4. O item deixa de aparecer no histórico médico.
5. A ausência do registro dificulta o atendimento, a investigação e a comprovação da ação anterior.

**Condição que favorece a ameaça:** permissões excessivas, exclusão definitiva sem confirmação, inconsistência entre banco e armazenamento ou ausência de versionamento e recuperação.

**Ativos afetados:** A03 (dados médicos), A04 (exames, laudos e imagens), A05 (receitas e prescrições), A08 (registros de auditoria), A09 (API), A10 (banco de dados) e A12 (armazenamento de documentos).

**Impacto clínico e operacional:** profissionais podem desconhecer resultados, prescrições ou atendimentos relevantes e tomar decisões com histórico incompleto. Pacientes podem precisar repetir exames ou perder a continuidade de um tratamento.

**Caso de abuso relacionado:** `CA06 — Exclusão de registro para ocultar uma ação`, consolidado na Etapa 1.

## Rastreabilidade

| Ameaça | Categoria | Caso de abuso | Ativos principais | Risco posterior |
| --- | --- | --- | --- | --- |
| T07 | Tampering | CA05 | A03, A04, A05, A08, A09, A10 e A12 | R07 — exame é alterado |
| T08 | Tampering | CA06 | A03, A04, A05, A08, A09, A10 e A12 | R08 — registro é excluído |

Os casos de abuso CA05 e CA06 estão consolidados na Etapa 1, e os riscos R07 e R08 estão registrados e avaliados na Etapa 2.
