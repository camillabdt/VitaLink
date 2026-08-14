# Matriz NIST e priorização de controles

Este documento reúne, em uma única visão, os riscos R01 a R15 e os controles propostos nas análises das Issues #16 a #20. A intenção é facilitar a leitura do conjunto e indicar por onde a implementação pode começar, considerando tanto a gravidade dos riscos quanto a relação de dependência entre os controles.

Neste documento, as funções do NIST CSF 2.0 são usadas para organizar os resultados esperados e **não como controles por si só**. `Protect`, por exemplo, indica a finalidade de proteção alcançada. O controle concreto é a ação que permite chegar a esse resultado, como validar a autorização no servidor, aplicar MFA, preservar versões ou limitar requisições.

## Conferência dos identificadores R01 a R15

| ID  | Origem | Evento de risco                                                       | Pontuação | Nível   |
| --- | ------ | --------------------------------------------------------------------- | --------: | ------- |
| R01 | T01    | Falso profissional obtém acesso autorizado pelo paciente.             |         8 | Alto    |
| R02 | T02    | Conta ou token comprometido é usado em nome da vítima.                |        12 | Crítico |
| R03 | T03    | Perfil, paciente, recurso ou operação fora do privilégio é alcançado. |        12 | Crítico |
| R04 | T04    | Dados médicos são acessados sem autorização ativa.                    |        12 | Crítico |
| R05 | T05    | Acesso continua após revogação ou expiração.                          |        12 | Crítico |
| R06 | T06    | Autorização limitada é ampliada.                                      |        12 | Crítico |
| R07 | T07    | Informação clínica é criada ou alterada indevidamente.                |         8 | Alto    |
| R08 | T08    | Registro clínico é excluído ou ocultado.                              |         8 | Alto    |
| R09 | T09    | Ação relevante não pode ser atribuída ao autor.                       |         6 | Médio   |
| R10 | T10    | Documento médico é exposto por link indevido.                         |        12 | Crítico |
| R11 | T11    | Dados de múltiplos pacientes são extraídos pela API.                  |         8 | Alto    |
| R12 | T12    | Compartilhamento não possui rastreabilidade suficiente.               |         9 | Alto    |
| R13 | T13    | Sobrecarga indisponibiliza API ou banco.                              |         9 | Alto    |
| R14 | T14    | Upload massivo esgota o armazenamento.                                |         6 | Médio   |
| R15 | T15    | Arquivo ou referência clínica é corrompido ou perdido.                |         8 | Alto    |

Todos os IDs de R01 a R15 estão presentes, sem lacunas ou repetições, e mantêm a correspondência com as ameaças T01 a T15. Para evitar classificações diferentes dentro do mesmo trabalho, foram mantidos os valores do [registro consolidado de riscos](etapa2-riscos-e-tratamento.md).

## Matriz consolidada por função NIST CSF 2.0

| Controle concreto                                                                                                              | Riscos tratados                        | Govern | Identify | Protect | Detect | Respond | Recover |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | :----: | :------: | :-----: | :----: | :-----: | :-----: |
| C01 — Verificar identidade e habilitação do profissional antes de liberar solicitações de acesso.                              | R01                                    |   X    |          |    X    |        |    X    |         |
| C02 — Aplicar MFA, proteger recuperação de conta, limitar sessões e revogar tokens comprometidos.                              | R02, R05                               |   X    |          |    X    |   X    |    X    |    X    |
| C03 — Decidir autorização no servidor por identidade, paciente, recurso, operação, escopo, período e estado; negar por padrão. | R03, R04, R05, R06, R07, R08, R10, R11 |   X    |          |    X    |   X    |    X    |         |
| C04 — Preservar versões, autorizar escrita e exclusão e executar restauração verificável de documentos.                        | R07, R08, R15                          |        |          |    X    |   X    |    X    |    X    |
| C05 — Registrar ator, ação, alvo, resultado e tempo, sem segredos, e restringir alteração dos registros de auditoria.          | R07, R08, R09, R12                     |   X    |          |    X    |   X    |    X    |         |
| C06 — Usar identificadores imprevisíveis, expiração e validação de acesso em links compartilhados.                             | R04, R06, R10                          |   X    |          |    X    |   X    |    X    |    X    |
| C07 — Limitar consultas e requisições e alertar volume ou comportamento anômalo.                                               | R11, R13                               |        |          |    X    |   X    |    X    |    X    |
| C08 — Limitar tamanho, tipo e quota de uploads e monitorar a capacidade de armazenamento.                                      | R13, R14                               |        |    X     |    X    |   X    |    X    |    X    |
| C09 — Manter backup, verificar integridade e testar recuperação de arquivos, referências e serviço.                            | R07, R08, R13, R15                     |        |    X     |    X    |   X    |    X    |    X    |
| C10 — Definir políticas, responsáveis, critérios de aceite e evidências para revisão periódica dos riscos.                     | R01–R15                                |   X    |    X     |         |        |         |         |

O `X` mostra para quais funções cada controle contribui. As colunas `Govern`, `Identify`, `Protect`, `Detect`, `Respond` e `Recover` servem apenas para organizar essa relação; a primeira coluna descreve a medida concreta que deverá ser adotada.

## Controles que tratam vários riscos

| Controle abrangente                      | Quantidade | Riscos tratados    | Abrangência                                                                                   |
| ---------------------------------------- | ---------: | ------------------ | --------------------------------------------------------------------------------------------- |
| C10 — Governança e revisão de riscos     |         15 | R01–R15            | Mantém responsáveis, critérios, evidências e decisões de tratamento para todo o registro.     |
| C03 — Autorização contextual no servidor |          8 | R03–R08, R10, R11  | Reduz acesso, alteração, exclusão e compartilhamento fora do escopo autorizado.               |
| C05 — Auditoria completa e protegida     |          4 | R07–R09, R12       | Permite detectar, atribuir e investigar alterações, exclusões e compartilhamentos.            |
| C09 — Integridade, backup e recuperação  |          4 | R07, R08, R13, R15 | Preserva e recupera dados e serviço após alteração, exclusão, corrupção ou indisponibilidade. |
| C02 — Proteção de conta e sessão         |          2 | R02, R05           | Reduz o uso de identidade comprometida e encerra acessos após revogação.                      |
| C06 — Proteção de compartilhamento       |          3 | R04, R06, R10      | Restringe links e recursos ao leitor, prazo e escopo autorizados.                             |
| C07 — Limitação e detecção de volume     |          2 | R11, R13           | Reduz extração em massa e sobrecarga da API.                                                  |
| C08 — Controle de uploads e capacidade   |          2 | R13, R14           | Evita que requisições ou arquivos esgotem os recursos disponíveis.                            |

Tratar muitos riscos não significa, automaticamente, ser o primeiro controle a implementar. C10 alcança todo o registro do ponto de vista de governança, mas os controles técnicos que reduzem riscos críticos e sustentam outras medidas precisam entrar antes na sequência prática.

## Ordem inicial de implementação

| Ordem | Controle ou conjunto de controles                                         | Riscos prioritários         | Dependências principais                                                                                |
| ----: | ------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------ |
|     1 | C03 — Autorização contextual no servidor e negação por padrão.            | R03–R08, R10, R11           | Perfis, ativos e fluxo de autorização documentados.                                                    |
|     2 | C02 e C01 — Proteção de conta, sessão e validação profissional.           | R01, R02, R05               | Identidades e perfis definidos; C03 usa a identidade autenticada para autorizar.                       |
|     3 | C05 — Auditoria completa e protegida.                                     | R07–R09, R12                | Identidade e decisões de autorização das prioridades 1 e 2 para registrar ator e resultado confiáveis. |
|     4 | C04 e C09 — Versionamento, integridade, backup e recuperação verificável. | R07, R08, R15 e apoio a R13 | Autorização para escrita/exclusão e auditoria das operações críticas.                                  |
|     5 | C06 — Proteção de links e compartilhamentos.                              | R04, R06, R10               | Autorização contextual e auditoria para validar e registrar cada acesso.                               |
|     6 | C07 — Limitação de consultas e detecção de volume anômalo.                | R11, R13                    | Autorização e auditoria para distinguir tráfego legítimo de abuso.                                     |
|     7 | C08 — Limites de upload e monitoramento de capacidade.                    | R13, R14                    | Métricas de capacidade e regras de uso definidas.                                                      |
|     8 | C10 — Formalização contínua de responsáveis, evidências e revisão.        | R01–R15                     | Recebe evidências produzidas por todos os controles anteriores e realimenta a priorização.             |

A sequência começa pelos riscos críticos e avança para os riscos altos e médios. Ela também acompanha o funcionamento esperado do sistema: primeiro é preciso reconhecer uma identidade e decidir o que ela pode fazer; depois, registrar as ações, preservar os dados e controlar o consumo dos recursos. A governança de C10 acompanha todo esse processo, embora sua avaliação completa dependa das evidências produzidas pelos controles técnicos.

## Justificativa das cinco primeiras prioridades

### 1. Autorização contextual no servidor

C03 aparece em primeiro lugar porque alcança oito riscos e está diretamente ligado a R03, R04, R05, R06 e R10, todos críticos. No VitaLink, estar autenticado não pode significar ter acesso automático ao prontuário. A cada operação, o servidor precisa conferir paciente, recurso, escopo, período e estado da autorização. As regras para links, consultas, alterações e exclusões dependem dessa decisão central para funcionar de maneira coerente.

### 2. Proteção de conta, sessão e validação profissional

Logo depois vêm C02 e C01, que tratam R02 e R05, classificados como críticos, além de R01, classificado como alto. Não adianta tomar uma boa decisão de autorização se a conta estiver nas mãos de outra pessoa ou se um falso profissional tiver sido aceito pelo sistema. Por isso, MFA, recuperação segura, revogação de tokens e validação profissional formam a base de confiança usada pela autorização e pela auditoria.

### 3. Auditoria completa e protegida

C05 trata R07, R08, R09 e R12 e permite entender o que aconteceu quando algo dá errado. Ele vem depois de identidade e autorização porque a trilha precisa registrar uma pessoa e uma decisão de acesso confiáveis. Com registros completos e protegidos, a equipe consegue detectar problemas, reconstruir ações, responsabilizar o autor e verificar se alterações e exclusões ocorreram como deveriam.

### 4. Versionamento, integridade, backup e recuperação

C04 e C09 tratam R07, R08 e R15, todos de nível alto, e também ajudam na recuperação relacionada a R13. Depois de controlar e registrar as operações, o sistema precisa manter condições de recuperar uma versão confiável. O versionamento, a verificação de integridade e os testes de restauração reduzem a chance de um paciente ou profissional depender de um histórico adulterado, incompleto ou indisponível.

### 5. Proteção de links e compartilhamentos

C06 trata R10, R04 e R06, todos críticos. Os links de compartilhamento precisam respeitar as mesmas regras de autorização e auditoria usadas no restante do sistema; um endereço imprevisível, sozinho, não garante acesso seguro. Por isso, esse controle vem depois das bases anteriores e combina validade limitada, verificação do leitor e registro de cada acesso.

## Resultado da priorização

A matriz cobre R01–R15 e as seis funções do NIST CSF 2.0. C03, C05, C09 e C10 se destacam pela quantidade de riscos alcançados. C01, C02 e C06, mesmo com alcance menor, ocupam posições importantes porque tratam riscos críticos e sustentam outras medidas. Parte dos controles possui código e testes; a redução residual só poderá ser confirmada após gate verde, DAST do VitaLink, monitoramento e evidências operacionais previstas.
