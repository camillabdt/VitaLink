# Ameaças de identidade, autenticação e privilégios

Este documento detalha ameaças para os atores já descritos no [README](../README.md): paciente e profissional de saúde. A análise usa os ativos do [inventário de ativos](inventario-de-ativos.md), o [índice da Etapa 1](etapa1-modelagem-de-ameacas.md) e diferencia identidade, autenticação, autorização e privilégio sem definir mecanismos de implementação.

## Conceitos e limites

- **Identidade:** representação do paciente ou do profissional no cadastro do VitaLink. Um identificador informado por uma pessoa é uma alegação, não uma prova de identidade.
- **Autenticação:** verificação da identidade alegada por meio de credenciais, sessão ou outro fator aceito pelo sistema.
- **Autorização:** decisão posterior à autenticação sobre o recurso e a operação que podem ser usados. O consentimento do paciente é uma condição de autorização para seus dados médicos, não uma prova de identidade.
- **Privilégio:** conjunto de operações e recursos permitidos para uma identidade autenticada, sempre limitado ao escopo correspondente.
- **Credencial:** dado usado para autenticar, como identificador e senha. É o ativo A06.
- **Token:** representação de sessão, recuperação de conta ou confirmação de operação. É o ativo A07 e não concede, sozinho, um privilégio.

O cadastro de pacientes estabelece a identidade no sistema. A conta é individual e o cadastro só pode manipular dados próprios; a implementação ainda precisa demonstrar essa regra. Aceitar um cadastro como se pertencesse a outra pessoa é uma condição de Spoofing.

Administrador ou Suporte está fora do escopo atual por DS01. Portanto, T03 trata a obtenção de permissões de outro perfil como ameaça; qualquer privilégio administrativo futuro exige nova decisão.

## Ameaças identificadas

| ID  | Categoria STRIDE       | Componente ou ativo                                             | Ameaça concreta                                                                                                                                                                             | Impacto e ativos afetados                                                                                                                                                                   |
| --- | ---------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T01 | Spoofing               | Cadastro profissional, identidade profissional e A02, A06 e A09 | Uma pessoa se cadastra ou se apresenta como profissional de saúde sem corresponder à identidade ou habilitação alegada e usa essa conta para solicitar acesso a pacientes.                  | O paciente pode conceder acesso a um falso profissional. Pode ocorrer exposição de A03, A04, A05 e A12, além de fraude, associação incorreta de atendimentos e perda de confiança.          |
| T02 | Spoofing               | Login, recuperação de conta, sessão, A06 e A07                  | Um atacante obtém credenciais ou um token ainda válido de paciente ou profissional e usa a sessão para agir como a vítima.                                                                  | O atacante pode consultar, alterar, anexar ou compartilhar dados conforme os privilégios da vítima. Os ativos afetados incluem A03 a A08, A09 e A10.                                        |
| T03 | Elevation of Privilege | API, autorização por recurso, perfis e A09 a A11                | Um paciente ou profissional autenticado manipula a solicitação, o identificador do recurso ou a informação de perfil para executar operações reservadas a outro perfil ou a outro paciente. | O atacante pode consultar ou alterar dados médicos, permissões e registros de auditoria fora do próprio escopo. Os ativos afetados incluem A03 a A10, além da integridade das autorizações. |

## Análise por ameaça

### T01 — Falso profissional

**Ator:** pessoa mal-intencionada que ainda não possui uma identidade profissional válida no VitaLink.

**Objetivo:** obter a confiança de pacientes e acessar informações médicas como se fosse profissional de saúde.

**Sequência possível:**

1. O ator fornece dados profissionais falsos ou de outra pessoa no cadastro.
2. O sistema cria uma conta profissional sem uma validação suficiente da identidade ou da habilitação.
3. O ator autentica a conta e solicita acesso a um paciente.
4. O paciente interpreta o perfil como legítimo e pode conceder uma autorização.
5. O ator consulta ou manipula os dados incluídos na autorização.

**Condição ou vulnerabilidade:** a ameaça ocorre se DS02 não for implementada corretamente. A decisão exige identificação e registro profissional informados e validação manual antes de solicitar acesso; ela não prova que o fluxo já existe.

**Caso de abuso relacionado:** [CA01 — Cadastro de falso profissional](etapa1-modelagem-de-ameacas.md#ca01--cadastro-de-falso-profissional).

### T02 — Uso de credenciais roubadas

**Ator:** atacante que obtém credenciais ou tokens de um paciente ou profissional.

**Objetivo:** assumir a conta da vítima e realizar operações em seu nome.

**Sequência possível:**

1. O atacante obtém uma senha, um token de sessão, um token de recuperação ou um token de confirmação.
2. O atacante inicia ou mantém uma sessão usando o material roubado.
3. O VitaLink associa a sessão à identidade da vítima.
4. O atacante consulta ou altera recursos dentro ou além do escopo que a conta deveria possuir.

**Condição ou vulnerabilidade:** o ataque ocorre se DS03 não for implementada corretamente. DS03 exige conta individual, recuperação que invalida sessões e limites de sessão; a decisão não é evidência de cobertura real.

**Caso de abuso relacionado:** [CA02 — Uso de conta ou token de outra pessoa](etapa1-modelagem-de-ameacas.md#ca02--uso-de-conta-ou-token-de-outra-pessoa).

### T03 — Elevação indevida de perfil ou privilégio

**Ator:** paciente, profissional ou atacante que já possui uma conta autenticada.

**Objetivo:** obter capacidades que não pertencem ao perfil, ao paciente ou ao escopo autorizado.

**Sequência possível:**

1. O ator autentica uma conta legítima.
2. O ator modifica um identificador de paciente, recurso, operação, perfil ou escopo na solicitação.
3. A API aceita a informação enviada pelo cliente sem verificar a autorização correspondente no servidor.
4. O ator consulta ou altera um recurso de outro paciente, altera uma autorização ou usa uma operação reservada a outro perfil.

**Condição ou vulnerabilidade:** ausência ou aplicação incompleta de DS04 e DS06, confiança em identificadores enviados pelo cliente, permissões mais amplas que a necessidade do perfil ou concessão implícita de novos privilégios.

**Casos de abuso relacionados:** [CA01](etapa1-modelagem-de-ameacas.md#ca01--cadastro-de-falso-profissional), [CA02](etapa1-modelagem-de-ameacas.md#ca02--uso-de-conta-ou-token-de-outra-pessoa) e [CA04](etapa1-modelagem-de-ameacas.md#ca04--consulta-ou-alteração-fora-do-escopo-autorizado). Todos podem resultar na obtenção de privilégios que não pertencem ao ator.

## Relação entre identidade, autenticação e privilégio

| Pergunta                      | Resposta documental                                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quem é a pessoa?              | A identidade registrada como paciente ou profissional. DS02 exige validação manual de profissional antes de solicitar acesso. |
| Como o sistema verifica isso? | Por autenticação de conta individual. DS03 define recuperação e limites de sessão; a implementação é pendente. |
| O que a pessoa pode fazer?    | A autorização define o recurso, a operação e o escopo. No caso de dados médicos, a autorização ativa do paciente é uma condição necessária.                                    |
| O que é privilégio?           | O limite efetivo de operações da identidade autenticada. Ele não deve ser ampliado porque o cliente enviou outro identificador ou porque uma função foi ocultada na interface. |
| O que um token prova?         | Apenas o contexto definido para a sessão, recuperação ou confirmação. O servidor ainda deve verificar se o token é válido e se a operação está autorizada.                     |

## Rastreabilidade inicial

| Ameaça | Caso de abuso | Ativos principais                  | Risco a registrar posteriormente                                       |
| ------ | ------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| T01    | CA01          | A02, A03, A04, A05, A06, A09 e A12 | [R01](etapa2-riscos-e-tratamento.md#registro-cálculo-e-justificativas) — acesso ou operação de falso profissional.        |
| T02    | CA02          | A03 a A08, A09 e A10               | [R02](etapa2-riscos-e-tratamento.md#registro-cálculo-e-justificativas) — uso da conta ou dos tokens de outra pessoa.      |
| T03    | CA01, CA02 e CA04 | A03 a A10                       | [R03](etapa2-riscos-e-tratamento.md#registro-cálculo-e-justificativas) — operação fora do perfil ou do escopo autorizado. |

As probabilidades, impactos, classificações, controles propostos e estimativas residuais estão no [registro da Etapa 2](etapa2-riscos-e-tratamento.md). Elas continuam sendo planejamento, não evidência de controles implementados. Nesta etapa, a relação direta com o NIST CSF 2.0 é **Identify**, por registrar identidades, ativos, ameaças e condições; a implementação de Protect, Detect, Respond e Recover permanece **[A confirmar]**.
