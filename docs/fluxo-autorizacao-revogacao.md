# Fluxo de autorização e revogação

Este documento descreve como o profissional solicita acesso e como o paciente concede, limita, revoga ou deixa expirar uma autorização. Autorização é uma decisão de acesso vinculada ao paciente, ao profissional, ao escopo e ao período permitido. Ela não substitui a autenticação e não transforma um token em permissão.

O fluxo complementa a definição de perfis e permissões do VitaLink, o [inventário de ativos](inventario-de-ativos.md) e a [classificação CIA](classificacao-cia-dos-ativos.md).

## Fluxo textual

1. O profissional autentica a própria conta e solicita acesso a um paciente identificado pelo sistema.
2. O sistema registra a solicitação como `Solicitada` e não libera dados médicos enquanto não houver decisão do paciente.
3. O paciente autenticado consulta quem solicitou o acesso e decide entre recusar ou conceder a autorização.
4. Ao recusar, o sistema registra `Recusada` e mantém o profissional sem acesso. Uma nova solicitação deverá ser feita se o profissional ainda precisar consultar os dados.
5. Ao conceder, o paciente define ou confirma o escopo e o período da autorização. O sistema registra `Ativa` somente se essas condições forem válidas.
6. Enquanto estiver `Ativa`, cada consulta ou atualização deve verificar novamente o paciente, o profissional, a operação, o recurso e a validade temporal da autorização.
7. O paciente pode reduzir o escopo ou revogar a autorização. A revogação muda o estado para `Revogada` e impede novos acessos a partir dessa decisão.
8. Quando o fim do período for alcançado, a autorização muda para `Expirada` e deixa de permitir novos acessos sem depender de uma ação manual do paciente.
9. Após `Revogada` ou `Expirada`, o profissional deverá solicitar uma nova autorização para voltar a acessar os dados. O histórico da autorização anterior permanece para auditoria.

## Estados da autorização

| Estado         | Como entra no estado                                               | Acesso permitido                                               | Próximos estados                        |
| -------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------- |
| Não solicitada | Não há solicitação válida para o paciente e o profissional         | Nenhum acesso profissional aos dados do paciente               | `Solicitada`                            |
| Solicitada     | Profissional autenticado envia uma solicitação válida              | Nenhum dado médico é liberado                                  | `Ativa` ou `Recusada`                   |
| Ativa          | Paciente concede explicitamente e o escopo e o período são válidos | Somente os recursos e operações autorizados, durante o período | `Revogada` ou `Expirada`                |
| Recusada       | Paciente rejeita a solicitação                                     | Nenhum acesso profissional                                     | `Solicitada`, mediante nova solicitação |
| Revogada       | Paciente encerra a autorização antes do fim                        | Nenhum novo acesso                                             | `Solicitada`, mediante nova solicitação |
| Expirada       | O fim do período autorizado é alcançado                            | Nenhum novo acesso                                             | `Solicitada`, mediante nova solicitação |

Não há transição automática de `Solicitada` para `Ativa`. A autorização exige decisão explícita do paciente. Estados finais não devem ser tratados como ativos por ausência de uma verificação.

## Escopo e duração

Uma autorização ativa deve identificar, no mínimo:

- o paciente que concede o acesso;
- o profissional que recebe o acesso;
- os dados ou tipos de documento abrangidos;
- as operações permitidas, como consulta ou atualização;
- o início e o fim do período autorizado;
- o estado atual e o momento da última mudança.

O escopo deve respeitar as funcionalidades documentadas do VitaLink e pode incluir dados médicos, exames, laudos, receitas, imagens ou consultas somente quando o paciente os incluir na autorização. A granularidade exata por tipo de documento ou operação permanece **[A confirmar]**.

A duração é um intervalo temporal obrigatório. A duração padrão, caso exista, e a possibilidade de o paciente escolher livremente o fim do período são **[A confirmar]**. Enquanto isso, uma autorização sem fim definido não deve ser considerada válida para acesso profissional.

## Regras de negócio de segurança

- Somente um paciente autenticado pode conceder, limitar ou revogar autorização sobre os próprios dados.
- Somente um profissional autenticado pode solicitar acesso em seu próprio nome.
- Uma solicitação pendente, recusada, revogada ou expirada não autoriza consulta, inclusão, alteração, download ou compartilhamento de dados médicos.
- O profissional não pode conceder autorização para si mesmo, alterar o paciente-alvo ou ampliar o escopo enviado pelo paciente.
- A autenticação identifica a pessoa, mas cada operação deve passar por autorização completa do recurso e do escopo.
- O paciente pode revogar sem depender do fim do período. A revogação deve bloquear novos acessos mesmo que exista uma sessão autenticada ou um token ainda não expirado.
- Um token representa sessão, recuperação ou confirmação de operação. Ele não cria autorização e não pode substituir a verificação do estado da autorização.
- **[A confirmar]** O mecanismo exato para invalidar tokens ou sessões relacionados à autorização revogada. O resultado esperado é que uma sessão antiga não consiga iniciar novos acessos ao escopo revogado.
- A expiração deve ser verificada no momento do acesso. Não basta ocultar o paciente na interface ou aguardar a expiração de um token.

## Registros de auditoria

As solicitações, decisões e mudanças de estado devem gerar registros de auditoria. Cada registro deve permitir reconstruir, sem armazenar segredos desnecessários:

- identidade do profissional que solicitou e do paciente que decidiu;
- paciente, escopo e operação relacionados;
- estado anterior e novo estado;
- data e horário da ação;
- resultado da tentativa;
- justificativa, quando houver uma ação de revogação ou alteração de escopo.

Tokens completos, senhas e o conteúdo integral de documentos não devem ser registrados nos logs. O histórico de auditoria é o ativo A08 e deve ser protegido contra alteração ou exclusão pelos perfis documentados.

## Rastreabilidade inicial

| Elemento               | Relação documentada                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| A03, A04, A05 e A12    | Dados médicos e documentos que só podem ser acessados dentro do escopo ativo.             |
| A07                    | Tokens e sessões não substituem a autorização e não podem manter acesso após a revogação. |
| A08                    | Registra solicitações, concessões, recusas, revogações e expirações.                      |
| A09 e A10              | API e banco de dados devem aplicar e persistir o estado da autorização.                   |
| Information Disclosure | Acesso sem consentimento, após revogação ou após expiração expõe dados protegidos.        |
| Elevation of Privilege | Ampliação do escopo permite operações além do privilégio concedido.                       |
| Govern e Identify      | Definição dos estados, responsáveis, escopo e período da autorização.                     |
| Protect e Detect       | Verificação do acesso e registros de auditoria das decisões e tentativas.                 |
| Respond                | Revogação e contenção de sessões ou tokens que tentem usar autorização encerrada.         |

## Lacunas a confirmar

- duração padrão e regras para renovação;
- granularidade do escopo por dado e por operação;
- necessidade de confirmação adicional para revogação ou alteração de escopo;
- comportamento esperado de sessões e tokens já emitidos quando a autorização for revogada;
- responsável por revisar autorizações e registros em caso de incidente.
