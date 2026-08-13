# Etapa 3 — Requisitos e decisões arquiteturais de segurança

## Status

Os requisitos, vulnerabilidades e decisões abaixo são **propostos** a partir das ameaças e riscos documentados. O repositório não contém implementação arquitetural verificável. Logo, nenhuma decisão é evidência de controle implementado.

O diagrama-fonte versionado está em [arquitetura-segura.mmd](diagramas/arquitetura-segura.mmd). Ele representa a arquitetura pretendida, não o estado executável.

## Requisitos de segurança propostos

| ID   | Requisito verificável                                                                                                                                                                                                                         | Origem                       |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| RS01 | A API deve decidir no servidor o acesso a dados médicos comparando identidade autenticada, paciente, recurso, operação, estado `Ativa` e período da autorização.                                                                              | T03–T06, R03–R06             |
| RS02 | Após revogação ou expiração, a API deve negar novos acessos ao escopo encerrado, inclusive em sessão já iniciada, e registrar o resultado.                                                                                                    | T05, R05                     |
| RS03 | Ações críticas, incluindo solicitação, decisão, consulta, compartilhamento, criação, alteração e exclusão de dados médicos, devem registrar ator, alvo, operação, resultado e tempo, sem registrar segredo ou conteúdo integral do documento. | T09, T12, R09, R12           |
| RS04 | Uma conta profissional somente deve adquirir capacidade de solicitar acesso a dados de pacientes após validação da identidade e do vínculo profissional definido para o sistema.                                                              | T01, R01                     |
| RS05 | Credenciais, recuperação de conta e sessões devem possuir controles que reduzam uso indevido e permitam invalidar sessões comprometidas, sem tratar a simples posse de um token como autorização para acessar qualquer paciente.              | T02, R02                     |
| RS06 | Toda criação, alteração ou exclusão de informação clínica deve ser autorizada por recurso e operação, preservar rastreabilidade da mudança e manter mecanismo de recuperação ou versão anterior quando aplicável.                             | T07, T08, T15, R07, R08, R15 |
| RS07 | Documentos não devem possuir rota pública nem URL permanente. Toda visualização ou download deve exigir sessão e autorização reavaliada pela API, sem expor diretamente o armazenamento.                                                      | T10, R10                     |
| RS08 | A API deve limitar consultas automatizadas e volume de leitura por ator ou origem e produzir evento detectável quando houver padrão anômalo de extração de dados.                                                                             | T11, R11                     |
| RS09 | A API e o armazenamento devem aplicar limites de requisições, tamanho e tipo de upload e quota de armazenamento, além de disponibilizar métricas que permitam detectar pressão de capacidade.                                                 | T13, T14, R13, R14           |

## Vulnerabilidades associadas

| ID  | Vulnerabilidade candidata                                                                                                            | Requisito que trata | Ameaças       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ------------- |
| V01 | Falta de autorização no servidor por recurso e operação, ou confiança em identificador do cliente.                                   | RS01                | T03, T04, T06 |
| V02 | Decisão de autorização reutilizada após revogação ou expiração.                                                                      | RS02                | T05           |
| V03 | Evento crítico sem registro suficiente para atribuição e investigação.                                                               | RS03                | T09, T12      |
| V04 | Conta profissional aceita como legítima sem validação suficiente da identidade ou do vínculo profissional.                           | RS04                | T01           |
| V05 | Credencial ou sessão comprometida permanece utilizável sem mecanismo adequado de proteção, recuperação ou invalidação.               | RS05                | T02           |
| V06 | Escrita, alteração ou exclusão de informação clínica ocorre sem autorização adequada, versionamento ou possibilidade de recuperação. | RS06                | T07, T08, T15 |
| V07 | Rota pública, URL permanente ou acesso direto ao armazenamento que permita obter documento sem sessão e autorização vigentes.        | RS07                | T10           |
| V08 | Consultas em grande volume podem percorrer registros sem limitação ou detecção de comportamento anômalo.                             | RS08                | T11           |
| V09 | Requisições e uploads não possuem limites suficientes de taxa, tamanho ou quota, permitindo exaustão de recursos.                    | RS09                | T13, T14      |

V01–V09 são condições a evitar no projeto. Não são achados no código, pois não há código do sistema disponível para análise.

## Decisões arquiteturais propostas

| ID   | Decisão                                                                                                                                                                                             | Rastreabilidade          | Critério de aceitação futuro                                                                                                                   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| DA01 | Centralizar a decisão de autorização na API antes de leitura ou escrita de dado médico. O cliente apenas solicita a operação.                                                                       | RS01, V01, T03–T06       | Teste com identificador de outro paciente deve ser negado no servidor.                                                                         |
| DA02 | Persistir autorização com paciente, profissional, escopo, operações, estado e período; reavaliar esse registro para cada acesso relevante.                                                          | RS02, V02, T05           | Teste após revogação e expiração deve negar novo acesso.                                                                                       |
| DA03 | Emitir evento de auditoria no serviço da API para ações críticas e restringir a alteração dos registros pelos perfis de usuário.                                                                    | RS03, V03, T09, T12      | Teste deve produzir registro com os campos mínimos, sem segredo, e permitir relacionar ação, ator, recurso e resultado.                        |
| DA04 | Manter o estado de validação profissional separado da simples criação da conta e impedir que conta profissional não validada solicite acesso a prontuários.                                         | RS04, V04, T01           | Teste com profissional não validado deve impedir solicitação de acesso; após validação, a operação pode seguir para consentimento do paciente. |
| DA05 | Separar autenticação, sessão e autorização, possibilitando invalidar sessões e proteger fluxos de recuperação de conta sem conceder acesso a pacientes somente pela posse de uma credencial válida. | RS05, V05, T02           | Após invalidação da sessão, nova requisição autenticada com a sessão comprometida deve ser rejeitada.                                          |
| DA06 | Processar criação, alteração e exclusão de informação clínica somente pela API autorizada, mantendo histórico ou versão recuperável e trilha de auditoria da mudança.                               | RS06, V06, T07, T08, T15 | Testes devem negar escrita indevida e demonstrar recuperação de uma versão anterior ou item excluído conforme a política definida.             |
| DA07 | Não implementar compartilhamento público na primeira versão. Mediar toda leitura pela API, sem fornecer URL direta do armazenamento.                                                                | RS07, V07, T10           | Requisição sem sessão ou autorização vigente deve ser negada e auditada, e nenhuma rota pública de documento deve existir.                     |
| DA08 | Aplicar limitação de volume e observação de padrões anômalos em endpoints de consulta, especialmente aqueles capazes de retornar dados médicos de múltiplos pacientes.                              | RS08, V08, T11           | Teste de consultas automatizadas acima do limite deve ser restringido e gerar evidência detectável.                                            |
| DA09 | Aplicar controles de capacidade na entrada da API e no armazenamento, incluindo limites de requisição, tamanho e tipo de arquivo, quota e monitoramento de utilização.                              | RS09, V09, T13, T14      | Requisição ou upload acima do limite deve ser rejeitado de forma controlada e a pressão de capacidade deve ser observável por métrica.         |

## Cobertura dos riscos prioritários

| Grupo                        | Riscos cobertos | Principais requisitos e decisões |
| ---------------------------- | --------------- | -------------------------------- |
| Identidade e sessão          | R01, R02        | RS04–RS05, DA04–DA05             |
| Autorização e consentimento  | R03–R06         | RS01–RS02, DA01–DA02             |
| Integridade e recuperação    | R07, R08, R15   | RS06, DA06                       |
| Auditoria e rastreabilidade  | R09, R12        | RS03, DA03                       |
| Compartilhamento e extração  | R10, R11        | RS07–RS08, DA07–DA08             |
| Disponibilidade e capacidade | R13, R14        | RS09, DA09                       |

As tecnologias e a separação dos componentes estão detalhadas no [plano de implementação da primeira versão](plano-implementacao-primeira-versao.md). DS03, DS06, DS08 e DS21 definem o comportamento obrigatório de sessão, autorização, auditoria e proteção de requisições; as decisões devem ser revisadas antes do código.

Os critérios de aceitação desta etapa descrevem evidências que deverão existir quando houver implementação. Enquanto testes, código e resultados executáveis não estiverem versionados, as decisões permanecem arquiteturais e não demonstram redução efetiva dos riscos.
