# Casos de abuso

Este é o documento canônico dos casos de abuso do VitaLink. Os identificadores e títulos são mantidos em um único lugar para que diferentes integrantes possam acrescentar casos sem duplicar fluxos ou alterar a rastreabilidade. Documentos de ameaças e riscos devem referenciar estes identificadores.

As condições descritas representam situações necessárias para que o abuso seja possível. Elas não afirmam que o sistema já possua uma vulnerabilidade; os controles implementados e testados estão descritos nas etapas de código seguro e verificação.

## Catálogo

| ID   | Caso de abuso                                | Tema                    | Issue responsável pelo detalhamento |
| ---- | -------------------------------------------- | ----------------------- | ----------------------------------- |
| CA01 | Cadastro de falso profissional               | Identidade              | #11                                 |
| CA02 | Roubo da conta de um paciente                | Identidade              | #11                                 |
| CA03 | Uso de autorização revogada                  | Consentimento           | #12                                 |
| CA04 | Consulta a prontuário sem autorização        | Consentimento           | #12                                 |
| CA05 | Alteração maliciosa de exame                 | Integridade             | #13                                 |
| CA06 | Exclusão de registro para ocultar uma ação   | Integridade e auditoria | #13                                 |
| CA07 | Compartilhamento público de documento médico | Privacidade             | #14                                 |
| CA08 | Extração em massa de informações             | Privacidade             | #14                                 |
| CA09 | Sobrecarga da API                            | Disponibilidade         | #15                                 |
| CA10 | Esgotamento do armazenamento                 | Disponibilidade         | #15                                 |

CA03, CA04, CA09 e CA10 são detalhados neste documento. CA01–CA02, CA05–CA06 e CA07–CA08 são detalhados nos documentos temáticos ligados pela [Etapa 1](etapa1-modelagem-de-ameacas.md).

## CA03 — Uso de autorização revogada

**Ator:** profissional de saúde que teve o acesso revogado ou atacante que utiliza a sessão ou o token desse profissional.

**Objetivo:** continuar consultando o prontuário de um paciente depois que o paciente encerrou a autorização.

**Condições necessárias:**

- o profissional recebeu anteriormente uma autorização `Ativa` para o paciente;
- o paciente revogou a autorização, alterando seu estado para `Revogada`;
- o ator ainda consegue enviar uma nova solicitação por uma sessão ou um token autenticado;
- o sistema reutiliza uma decisão anterior ou deixa de verificar o estado atual da autorização no momento do acesso.

**Fluxo de abuso:**

1. O profissional obtém uma autorização `Ativa` e consulta dados dentro do escopo concedido.
2. O paciente revoga a autorização.
3. O ator reutiliza a sessão ou o token e solicita novamente o prontuário do mesmo paciente.
4. A API reconhece a autenticação, mas trata a sessão, o token ou a decisão anterior como autorização suficiente.
5. A API deixa de confirmar que a autorização está `Revogada` e permite a nova consulta.
6. O ator acessa dados ou documentos médicos que não deveria mais consultar.

**Falha de verificação:** o estado atual da autorização não é consultado para a nova operação. A autenticação ou um token ainda válido é confundido com autorização ativa, contrariando a revogação decidida pelo paciente.

**Impacto:** exposição de dados médicos e documentos do paciente, perda do controle sobre o consentimento e redução da confiabilidade dos registros de acesso. O abuso pode comprometer A03, A04, A05 e A12, além de envolver A07, A08, A09 e A10.

**Ameaças relacionadas:** T05 — Uso de autorização revogada ou expirada, com T04 — Acesso sem autorização como consequência do estado inválido.

**Categorias STRIDE relacionadas:** Information Disclosure e Elevation of Privilege.

## CA09 — Sobrecarga da API

**Ator:** pessoa externa, usuário autenticado ou cliente automatizado capaz de enviar grande volume de requisições.

**Objetivo:** degradar ou indisponibilizar a API e o banco de dados para impedir o uso legítimo do VitaLink.

**Condições necessárias:**

- o ator alcança um ou mais endpoints públicos ou autenticados;
- os limites por conta, origem ou rota são ausentes, insuficientes ou contornáveis;
- a aplicação não restringe adequadamente concorrência, filas ou conexões com serviços dependentes.

**Fluxo de abuso:**

1. O ator identifica rotas com custo relevante, como autenticação, consulta ou upload.
2. O ator automatiza requisições simultâneas ou repetidas.
3. A API processa o volume sem aplicar o limite adequado.
4. Processamento, conexões ou serviços dependentes atingem saturação.
5. Pacientes e profissionais recebem respostas lentas, erros ou indisponibilidade.

**Impacto:** interrupção de consultas e registros clínicos, atraso no atendimento e redução da disponibilidade de A09–A11.

**Ameaça relacionada:** T13 — Sobrecarga de requisições na API.

**Categoria STRIDE relacionada:** Denial of Service.

## CA10 — Esgotamento do armazenamento

**Ator:** usuário autenticado ou cliente automatizado capaz de iniciar uploads.

**Objetivo:** consumir quota, quarentena ou capacidade do armazenamento até impedir novos documentos legítimos.

**Condições necessárias:**

- o ator possui acesso a uma rota de upload;
- tamanho, tipo, frequência ou quota não são validados antes da persistência;
- arquivos rejeitados ou abandonados permanecem ocupando espaço sem tratamento.

**Fluxo de abuso:**

1. O ator prepara arquivos numerosos, grandes ou com metadados inconsistentes.
2. O ator envia os arquivos repetidamente para a API.
3. A aplicação aceita ou mantém o conteúdo sem aplicar todos os limites.
4. Quarentena ou armazenamento aprovado consome a capacidade disponível.
5. Novos exames, laudos, receitas ou imagens legítimos deixam de ser aceitos.

**Impacto:** indisponibilidade de A12 e prejuízo ao registro e acesso de A04–A05, com possível pressão adicional sobre A09–A11.

**Ameaça relacionada:** T14 — Esgotamento do armazenamento por envio massivo.

**Categoria STRIDE relacionada:** Denial of Service.

## CA04 — Consulta a prontuário sem autorização

**Ator:** profissional de saúde autenticado sem autorização para o paciente ou atacante que utiliza uma conta legítima.

**Objetivo:** consultar o prontuário de um paciente que não concedeu acesso ao ator para aquele recurso e operação.

**Condições necessárias:**

- não existe autorização `Ativa` entre o paciente, o profissional, o recurso e a operação solicitada;
- o ator consegue informar ou alterar o identificador de um paciente ou prontuário em uma solicitação;
- o sistema verifica apenas a autenticação, o perfil profissional ou a existência do recurso, sem validar a autorização correspondente.

**Fluxo de abuso:**

1. O ator autentica uma conta profissional ou utiliza uma sessão profissional já autenticada.
2. O ator escolhe um paciente para o qual não possui autorização ativa.
3. O ator envia à API o identificador desse paciente ou de um recurso do prontuário.
4. A API confirma somente que a conta está autenticada e possui perfil profissional.
5. A API deixa de comparar a solicitação com o paciente, o recurso, a operação, o escopo e o período autorizados.
6. O sistema devolve dados do prontuário ao ator.

**Falha de verificação:** a aplicação trata identidade autenticada ou perfil profissional como permissão para consultar qualquer paciente, ou confia no identificador informado pelo cliente sem aplicar autorização por recurso e operação.

**Impacto:** exposição do histórico e de documentos médicos, violação do controle do paciente e possível dificuldade para detectar ou reconstruir o acesso indevido. O abuso pode comprometer A03, A04, A05, A08, A09, A10 e A12.

**Ameaças relacionadas:** T04 — Acesso sem autorização e T06 — Ampliação indevida da permissão quando o ator usa uma autorização limitada para alcançar outro paciente, recurso ou operação.

**Categorias STRIDE relacionadas:** Information Disclosure e Elevation of Privilege.

## Rastreabilidade inicial

| Caso de abuso | Ameaças   | Ativos principais                       | Riscos relacionados                                                  |
| ------------- | --------- | --------------------------------------- | -------------------------------------------------------------------- |
| CA03          | T05 e T04 | A03, A04, A05, A07, A08, A09, A10 e A12 | `R05` — uso de autorização revogada ou expirada                      |
| CA04          | T04 e T06 | A03, A04, A05, A08, A09, A10 e A12      | `R04 e R06` — acesso sem autorização ou ampliação indevida de escopo |
| CA09          | T13       | A09, A10 e A11                          | `R13` — sobrecarga indisponibiliza API ou banco                      |
| CA10          | T14       | A04, A05, A09, A11 e A12                | `R14` — upload massivo esgota o armazenamento                        |

As probabilidades, os impactos numéricos, o estado dos controles e os riscos residuais estimados estão consolidados na Etapa 2. Este documento mantém o detalhamento dos casos de abuso; a existência de controles preventivos não elimina os cenários inerentes nem comprova risco residual em produção.
