# Riscos de integridade e rastreabilidade

Este documento transforma as ameaças T07, T08 e T09 em riscos priorizados para o VitaLink e propõe o plano de tratamento da Issue #18. A avaliação segue os [critérios de probabilidade, impacto e risco residual](etapa2-criterios-e-risco-residual.md): `pontuação = probabilidade × impacto`, com nível baixo entre 1 e 3, médio entre 4 e 7, alto entre 8 e 11 e crítico entre 12 e 16.

Os valores residuais permanecem estimativas. A aplicação já implementa autorização de escrita, correções versionadas, auditoria pseudonimizada e testes de backup; alertas de adulteração/interrupção e restauração operacional periódica ainda precisam de evidência.

## Registro de riscos

| ID  | Evento de risco                                                           | Origem    | Ativos principais      | Probabilidade | Impacto | Pontuação | Nível |
| --- | ------------------------------------------------------------------------- | --------- | ---------------------- | ------------: | ------: | --------: | ----- |
| R07 | Exame ou outra informação clínica é criado ou alterado indevidamente.     | T07, CA05 | A03–A05, A08–A10 e A12 |             2 |       4 |         8 | Alto  |
| R08 | Registro clínico ou sua referência é excluído ou ocultado indevidamente.  | T08, CA06 | A03–A05, A08–A10 e A12 |             2 |       4 |         8 | Alto  |
| R09 | Uma ação crítica sobre informação médica não pode ser atribuída ao autor. | T09, CA06 | A03–A05 e A08–A10      |             2 |       3 |         6 | Médio |

## Justificativas individuais

### R07 — Exame é alterado

**Probabilidade — 2 (média-baixa).** A alteração indevida depende de uma conta ou sessão válida, de falha de autorização por paciente, recurso e operação, ou de acesso indevido à API, ao banco ou ao armazenamento. A exploração é possível, mas exige uma condição específica e conhecimento moderado sobre identificadores, rotas ou metadados do sistema.

**Impacto — 4 (muito alto).** Um exame, laudo, receita ou registro adulterado pode ser interpretado como legítimo e influenciar diagnóstico, medicamento ou tratamento. Além do dano clínico potencial, a alteração compromete a confiança no prontuário e pode gerar consequências legais e regulatórias.

**Cálculo:** `2 × 4 = 8 — Alto`.

### R08 — Registro é excluído

**Probabilidade — 2 (média-baixa).** A exclusão ou ocultação depende de permissão excessiva, falha na autorização da operação, manipulação de identificador ou inconsistência entre banco e armazenamento. Não é uma operação esperada para qualquer usuário, mas pode ocorrer pontualmente se a exclusão não exigir confirmação e não preservar versão recuperável.

**Impacto — 4 (muito alto).** A perda de consulta, exame, laudo, receita ou vínculo com o arquivo deixa o histórico clínico incompleto. Isso pode causar repetição de exames, atraso no atendimento, decisão clínica sem informação relevante e impossibilidade de comprovar o conteúdo anterior.

**Cálculo:** `2 × 4 = 8 — Alto`.

### R09 — Ação não pode ser atribuída ao autor

**Probabilidade — 2 (média-baixa).** A falta de atribuição depende de logs incompletos, identidade de sessão não vinculada ao evento, relógios inconsistentes, contas compartilhadas ou possibilidade de alterar os próprios registros de auditoria. Essas condições são específicas, mas plausíveis quando a auditoria não é definida e testada de forma centralizada.

**Impacto — 3 (alto).** A ausência de evidência confiável dificulta investigar o incidente, responsabilizar o autor, reconstruir a sequência de ações e restaurar o prontuário correto. O dano é significativo para a confiança e a resposta ao incidente, embora não implique necessariamente alteração clínica em todos os casos.

**Cálculo:** `2 × 3 = 6 — Médio`.

## Estratégia de tratamento

A estratégia escolhida para R07, R08 e R09 é **mitigar**. O VitaLink precisa permitir inclusão e manutenção de documentos e também precisa registrar operações relevantes; portanto, evitar essas funções eliminando-as não é adequado. Os controles devem reduzir principalmente a probabilidade, enquanto o impacto inerente de uma falha sobre informações médicas permanece alto.

## Plano de tratamento

| Risco         | Controle concreto e observável                                                                                                                              | Função NIST CSF 2.0 | Responsável proposto                                     | Evidência esperada                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| R07           | Validar no servidor a identidade, o perfil, o paciente, o recurso e a operação antes de criar ou alterar conteúdo; negar por padrão.                        | Protect             | Desenvolvimento Backend                                  | Testes automatizados demonstrando `403` para escrita fora do escopo e sucesso apenas para operações autorizadas.                         |
| R07           | Preservar histórico de versões com autor, data, versão anterior e nova versão; impedir sobrescrita silenciosa.                                              | Protect; Detect     | Desenvolvimento Backend e Banco de Dados                 | Histórico versionado consultável e teste que compara e recupera versões após uma alteração.                                              |
| R07           | Calcular e verificar hash do arquivo no envio, armazenamento e recuperação.                                                                                 | Protect; Detect     | Desenvolvimento Backend e Infraestrutura                 | Teste de integridade que detecta arquivo modificado e registro do hash associado à versão.                                               |
| R08           | Exigir confirmação explícita e nova verificação de autorização para exclusões; registrar motivo e resultado da operação.                                    | Protect; Govern     | Desenvolvimento Backend e Produto                        | Testes de exclusão negada sem confirmação ou autorização e registro do motivo na auditoria.                                              |
| R08           | Aplicar exclusão lógica ou retenção recuperável e manter cópia versionada; testar restauração do registro e do arquivo.                                     | Protect; Recover    | Desenvolvimento Backend, Banco de Dados e Infraestrutura | Teste de restauração bem-sucedido, com conteúdo e metadados conferidos após exclusão controlada.                                         |
| R09           | Registrar identidade, perfil, sessão, data e hora sincronizadas, operação, paciente, recurso, resultado e origem para toda ação crítica e tentativa negada. | Detect              | Desenvolvimento Backend                                  | Eventos de auditoria completos gerados por testes de criação, alteração, exclusão e acesso negado.                                       |
| R09           | Restringir escrita e exclusão dos logs, separar a auditoria dos dados operacionais e detectar alteração ou interrupção do envio de eventos.                 | Protect; Detect     | Infraestrutura e Segurança                               | Teste de permissão negando alteração do log, verificação de integridade e alerta produzido quando a trilha é interrompida ou modificada. |
| R07, R08, R09 | Definir procedimento para investigar o evento, bloquear acessos, preservar evidências, restaurar a versão íntegra e registrar a decisão tomada.             | Respond; Recover    | Segurança, Infraestrutura e responsável pelo dado        | Simulação documentada contendo alerta, linha do tempo, evidências preservadas, restauração e resultado da revisão.                       |

As funções NIST organizam os resultados esperados: **Govern** estabelece as regras da operação; **Protect** previne alteração ou exclusão indevida; **Detect** identifica eventos e violações de integridade; **Respond** orienta contenção e investigação; e **Recover** restaura conteúdo confiável. A função NIST não substitui o controle técnico descrito na tabela.

## Estimativa de risco residual

| Risco | Nível inicial | Probabilidade residual | Impacto residual | Pontuação residual | Nível residual | Condição para aceite                                                                                                       |
| ----- | ------------- | ---------------------: | ---------------: | -----------------: | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| R07   | Alto (8)      |                      1 |                4 |                  4 | Médio          | Autorizações negativas, versionamento e verificação de integridade aprovados; restauração da versão íntegra comprovada.    |
| R08   | Alto (8)      |                      1 |                4 |                  4 | Médio          | Exclusão sem autorização ou confirmação bloqueada e restauração de registro e arquivo aprovada em teste.                   |
| R09   | Médio (6)     |                      1 |                3 |                  3 | Baixo          | Eventos completos e protegidos produzidos para todas as ações críticas, com alerta de adulteração ou interrupção validado. |

A estimativa reduz a probabilidade para 1 após a aplicação conjunta e a verificação dos controles. O impacto permanece em 4 para R07 e R08 porque uma alteração ou perda clínica bem-sucedida ainda pode causar dano grave; em R09, permanece em 3 porque uma falha de atribuição ainda prejudica investigação e responsabilização. Se as evidências da condição de aceite não existirem ou falharem, deve ser mantida a avaliação inicial.

## Rastreabilidade

| Risco | Ameaça | Caso de abuso | Documento de origem                                                                             |
| ----- | ------ | ------------- | ----------------------------------------------------------------------------------------------- |
| R07   | T07    | CA05          | [Ameaças à integridade](ameacas-integridade-documentos-medicos.md)                              |
| R08   | T08    | CA06          | [Ameaças à integridade](ameacas-integridade-documentos-medicos.md)                              |
| R09   | T09    | CA06          | [Ameaças de repúdio e ausência de rastreabilidade](ameacas-repudio-ausencia-rastreabilidade.md) |
