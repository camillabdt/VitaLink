# Fluxo de autorização e revogação

Este documento descreve como o profissional solicita acesso e como o paciente concede, limita, revoga ou deixa expirar uma autorização. Autorização é uma decisão de acesso vinculada ao paciente, ao profissional, ao escopo e ao período permitido. Ela não substitui a autenticação e não transforma um token em permissão.

O fluxo complementa a definição de perfis e permissões do VitaLink, o [inventário de ativos](inventario-de-ativos.md) e a [classificação CIA](classificacao-cia-dos-ativos.md).

## Fluxo textual

1. O paciente autenticado gera um código de acesso temporário, de uso único, válido por 24 horas e revogável.
2. O profissional autenticado e validado usa o código para identificar o paciente e criar uma solicitação com justificativa. O código não revela conteúdo clínico nem concede acesso.
3. O sistema registra a solicitação como `Solicitada` e não libera dados médicos enquanto não houver decisão do paciente.
4. O paciente autenticado consulta quem solicitou o acesso e decide entre recusar ou conceder a autorização.
5. Ao recusar, o sistema registra `Recusada` e mantém o profissional sem acesso. Uma nova solicitação deverá ser feita se o profissional ainda precisar consultar os dados.
6. Ao conceder, o paciente define ou confirma o escopo e o período, confirma a ação com TOTP adicional e o sistema registra `Ativa` somente se todas as condições forem válidas.
7. Enquanto estiver `Ativa`, cada consulta ou atualização deve verificar novamente o paciente, o profissional, a operação, o recurso e a validade temporal da autorização.
8. O paciente pode reduzir o escopo ou revogar a autorização com TOTP adicional. A revogação muda o estado para `Revogada` e impede novos acessos a partir dessa decisão.
9. Quando o fim do período for alcançado, a autorização muda para `Expirada` e deixa de permitir novos acessos sem depender de uma ação manual do paciente.
10. Após `Revogada` ou `Expirada`, o profissional deverá solicitar uma nova autorização para voltar a acessar os dados. O histórico da autorização anterior permanece para auditoria.

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

O escopo respeita DS04 das [decisões de segurança](decisoes-de-seguranca.md): a autorização lista categorias de dado e operações `consultar`, `anexar` ou `atualizar`. O mapeamento normativo de cada recurso está no [plano de implementação](implementacao-segura/plano-implementacao-primeira-versao.md#matriz-normativa-de-recurso-e-autorização). Uma categoria nunca satisfaz outra, e exclusão não é concedida a profissionais.

A duração é um intervalo temporal obrigatório. Conforme DS05, o padrão é 30 dias e o paciente pode escolher prazo entre 1 e 90 dias. Uma autorização sem fim definido não é válida para acesso profissional.

## Regras de negócio de segurança

- Somente um paciente autenticado pode conceder, limitar ou revogar autorização sobre os próprios dados.
- Somente um profissional autenticado pode solicitar acesso em seu próprio nome.
- O profissional só pode solicitar acesso após validação manual e mediante código temporário válido compartilhado pelo paciente.
- O código temporário é de uso único, expira após 24 horas e pode ser revogado pelo paciente; ele não substitui a autorização.
- Uma solicitação pendente, recusada, revogada ou expirada não autoriza consulta, inclusão, alteração, download ou compartilhamento de dados médicos.
- O profissional não pode conceder autorização para si mesmo, alterar o paciente-alvo ou ampliar o escopo enviado pelo paciente.
- A autenticação identifica a pessoa, mas cada operação deve passar por autorização completa do recurso e do escopo.
- O paciente pode revogar sem depender do fim do período. A revogação deve bloquear novos acessos mesmo que exista uma sessão autenticada ou um token ainda não expirado.
- Um token representa sessão, recuperação ou confirmação de operação. Ele não cria autorização e não pode substituir a verificação do estado da autorização.
- Conforme DS06, a sessão pode continuar autenticada, mas não conserva autorização: a API reavalia a decisão a cada acesso e bloqueia imediatamente o escopo revogado.
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

## Decisões aplicadas

O paciente deve confirmar com TOTP adicional a concessão, a redução de escopo e a revogação. Renovação exige nova solicitação e nova decisão explícita do paciente. A equipe de Segurança revisa autorizações e registros em incidentes, conforme DS09.
