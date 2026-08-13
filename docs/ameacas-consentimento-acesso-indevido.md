# Ameaças de consentimento e acesso indevido

Este documento detalha ameaças relacionadas ao uso incorreto, prolongado ou fraudulento das autorizações do paciente. A análise considera os perfis do [README](../README.md), os ativos do [inventário de ativos](inventario-de-ativos.md), o [índice da Etapa 1](etapa1-modelagem-de-ameacas.md) e o fluxo documental de autorização e revogação, sem implementar mecanismos.

## Consentimento e autorização

Consentimento é a decisão explícita do paciente de permitir que um profissional acesse dados ou realize operações dentro de um escopo e de um período. Ele é uma condição de autorização, não uma prova de identidade e não substitui a autenticação do paciente ou do profissional.

As premissas usadas nesta análise são:

- o profissional solicita acesso em seu próprio nome;
- o paciente decide conceder ou recusar o acesso aos próprios dados;
- uma autorização `Ativa` identifica paciente, profissional, escopo, operações e período;
- uma autorização `Solicitada`, `Recusada`, `Revogada` ou `Expirada` não libera dados médicos;
- cada acesso verifica novamente a autorização do recurso, do usuário e do momento;
- a revogação impede novos acessos mesmo quando a sessão ou o token ainda não expirou;
- decisões, mudanças de estado e tentativas bloqueadas são registradas no ativo A08.

A granularidade, duração e revogação seguem DS04–DS06. A implementação desses comportamentos permanece pendente, e a ausência de implementação não autoriza acesso por padrão.

## Ameaças identificadas

| ID  | Categoria STRIDE                                | Componente ou ativo                                                 | Ameaça concreta                                                                                                                                       | Permissão violada e impacto                                                                                                                                                                            |
| --- | ----------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T04 | Information Disclosure                          | API, autorização por recurso e A03 a A05 e A12                      | Um profissional ou atacante acessa dados médicos de um paciente sem existir uma autorização ativa para aquele paciente e recurso.                     | Viola o controle do paciente sobre seus dados e pode expor histórico, exames, receitas, laudos e imagens. Também afeta A08, A09 e A10 se o acesso não for registrado ou se a autorização for ignorada. |
| T05 | Information Disclosure e Elevation of Privilege | Estado da autorização, sessão, token A07 e A09                      | Um profissional continua usando uma autorização que foi revogada ou expirada, ou uma sessão antiga permite novos acessos com base no estado anterior. | Viola a revogação ou o fim do período e prolonga um privilégio encerrado. Pode expor ou alterar A03 a A05 e A12 e comprometer a confiabilidade de A08.                                                 |
| T06 | Elevation of Privilege e Information Disclosure | Escopo de autorização, identificadores de recursos, API e A09 e A10 | Um profissional com autorização limitada amplia a solicitação para outro paciente, dado ou operação e obtém permissões além das concedidas.           | Viola o escopo definido pelo paciente. Pode permitir consulta, alteração ou compartilhamento indevido de A03 a A05 e A12, além de modificar autorizações e registros relacionados.                     |

## Análise por ameaça

### T04 — Acesso sem autorização

**Ator:** profissional autenticado sem autorização para o paciente ou atacante que tenta usar uma conta legítima.

**Objetivo:** consultar ou alterar dados médicos sem que o paciente tenha concedido acesso.

**Sequência possível:**

1. O ator autentica uma conta ou envia uma solicitação para a API.
2. O ator informa o identificador de um paciente ou recurso que não está no próprio escopo.
3. A aplicação verifica apenas a autenticação, o perfil geral ou a existência do recurso.
4. A API devolve ou altera dados médicos sem confirmar uma autorização `Ativa` para aquele paciente, operação e recurso.

**Condição ou vulnerabilidade:** ausência de implementação de DS04 e DS06, concessão implícita baseada apenas no perfil profissional ou confiança em identificadores fornecidos pelo cliente.

**Caso de abuso relacionado:** [CA04 — Consulta a prontuário sem autorização](casos-de-abuso.md#ca04--consulta-a-prontuário-sem-autorização).

### T05 — Uso de autorização revogada ou expirada

**Ator:** profissional que teve o acesso revogado ou cujo período autorizado terminou, ou atacante que reutiliza uma sessão ou token antigo.

**Objetivo:** manter um acesso que o paciente encerrou ou que deixou de ser válido pelo tempo definido.

**Sequência possível:**

1. O profissional obtém uma autorização `Ativa` e inicia uma sessão.
2. O paciente revoga a autorização ou o período chega ao fim.
3. A autorização passa a `Revogada` ou `Expirada`.
4. O ator reutiliza a sessão, o token ou uma decisão de autorização armazenada anteriormente.
5. O sistema permite novo acesso sem consultar o estado atual.

**Condição ou vulnerabilidade:** verificação feita somente no momento da emissão do token, cache de autorização desatualizado, sessão que não é reavaliada ou ausência de contenção após revogação e expiração. DS06 exige reavaliação no acesso e bloqueio imediato de novo acesso.

**Caso de abuso relacionado:** [CA03 — Uso de autorização revogada](casos-de-abuso.md#ca03--uso-de-autorização-revogada).

### T06 — Ampliação indevida da permissão

**Ator:** profissional que possui uma autorização legítima, paciente ou atacante que manipula uma solicitação autenticada.

**Objetivo:** transformar uma autorização limitada em acesso a outros dados, pacientes ou operações.

**Sequência possível:**

1. O ator recebe autorização para um paciente, recurso ou operação específicos.
2. O ator altera o identificador do paciente, o tipo de documento, a operação ou o escopo enviado à API.
3. O servidor aplica a autorização somente ao módulo ou ao perfil, sem comparar o pedido com o escopo concedido.
4. O ator acessa ou altera recursos fora da decisão do paciente.

**Condição ou vulnerabilidade:** escopo amplo ou implícito, autorização incompleta por recurso e operação, confiança em parâmetros do cliente ou possibilidade de alterar uma autorização sem decisão do paciente. DS04 define a granularidade exigida.

**Caso de abuso relacionado:** [CA04 — Consulta a prontuário sem autorização](casos-de-abuso.md#ca04--consulta-a-prontuário-sem-autorização), quando uma autorização limitada é usada para alcançar outro paciente, recurso ou operação.

## Permissões explicitamente violadas

- Acesso sem autorização viola o controle documentado do paciente sobre o compartilhamento dos próprios dados.
- Uso após revogação viola o estado atual da autorização e mantém um privilégio que deixou de existir.
- Uso após expiração viola o limite temporal da autorização.
- Ampliação de escopo viola a distinção entre “profissional autorizado” e “profissional autorizado para um recurso e uma operação específicos”.
- Nenhum token, perfil profissional ou autenticação válida autoriza, por si só, acesso a todos os pacientes ou a todos os tipos de dado.

## Rastreabilidade inicial

| Ameaça | Caso de abuso | Ativos principais                  | Risco a registrar posteriormente                                |
| ------ | ------------- | ---------------------------------- | --------------------------------------------------------------- |
| T04    | CA04          | A03, A04, A05, A08, A09, A10 e A12 | [R04](etapa2-riscos-e-tratamento.md#registro-consolidado) — acesso a dados sem consentimento ativo.   |
| T05    | CA03          | A03 a A08, A09 e A10               | [R05](etapa2-riscos-e-tratamento.md#registro-consolidado) — uso de autorização revogada ou expirada.  |
| T06    | CA04          | A03, A04, A05, A08, A09, A10 e A12 | [R06](etapa2-riscos-e-tratamento.md#registro-consolidado) — ampliação indevida de escopo ou operação. |

As probabilidades, impactos, classificações, controles propostos e estimativas residuais estão no [registro da Etapa 2](etapa2-riscos-e-tratamento.md). Elas continuam sendo planejamento, não evidência de controles implementados. Nesta etapa, a relação direta com o NIST CSF 2.0 é **Identify**, por registrar consentimento, escopo, estados, ativos e ameaças; a implementação de Protect, Detect e Respond permanece **[A confirmar]**.
