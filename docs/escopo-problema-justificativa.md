# Escopo, problema e justificativa do VitaLink

## 1. Identificação do sistema

**Nome:** VitaLink
**Disciplina:** Engenharia de Software Seguro
**Repositório:** <https://github.com/camillabdt/VitaLink>
**Integrantes:** Amanda Dias, Camilla Borchhardt, Luiza Figueiredo, Milena Castro, Rafaela Nunes e Tauani Sauceda.

O VitaLink é uma proposta de sistema para gerenciamento seguro de informações médicas. O sistema tem como objetivo permitir que pacientes mantenham um histórico digital de saúde, reunindo exames, consultas, receitas, laudos e imagens médicas em um único ambiente.

Os profissionais de saúde poderão registrar atendimentos, adicionar documentos e consultar informações médicas apenas quando houver autorização válida do paciente.

O projeto é analisado sob a perspectiva de Engenharia de Software Seguro, considerando privacidade, controle de acesso, integridade das informações, disponibilidade do serviço e rastreabilidade das operações.

## 2. Problema

Informações relacionadas à saúde de uma pessoa podem estar distribuídas entre diferentes documentos, clínicas, profissionais e sistemas. Essa fragmentação pode dificultar o acompanhamento do histórico médico e o compartilhamento controlado de informações durante atendimentos.

Além da dificuldade de organização, dados médicos possuem caráter sensível. Um sistema responsável por armazenar e compartilhar essas informações precisa considerar situações como:

* acesso ao prontuário por pessoas não autorizadas;
* uso indevido de contas de pacientes ou profissionais;
* alteração ou exclusão de exames e laudos;
* exposição de informações médicas;
* manutenção de acesso após revogação de uma autorização;
* indisponibilidade do sistema ou dos documentos armazenados;
* dificuldade para identificar quem realizou determinada operação.

O VitaLink busca representar um cenário no qual essas informações possam ser centralizadas sem retirar do paciente o controle sobre quem pode consultar seus dados.

## 3. Justificativa

A escolha de um sistema de informações médicas permite analisar diferentes aspectos relevantes de Engenharia de Software Seguro em um mesmo domínio.

O VitaLink manipula dados pessoais, informações médicas, credenciais, documentos e registros de acesso. Por isso, falhas de segurança podem comprometer confidencialidade, integridade e disponibilidade de ativos considerados sensíveis.

Além disso, o sistema possui diferentes perfis de usuários e depende de decisões explícitas de autorização. Isso possibilita analisar problemas relacionados à autenticação, controle de acesso, consentimento, gerenciamento de privilégios, auditoria e proteção de documentos.

O domínio também favorece a aplicação de técnicas de modelagem de ameaças, como STRIDE, e posteriormente permite relacionar ameaças e riscos a controles de segurança e às funções do NIST Cybersecurity Framework.

Dessa forma, o VitaLink oferece um contexto adequado para estudar segurança desde as etapas iniciais do desenvolvimento, antes da implementação das funcionalidades.

## 4. Escopo da análise

A análise considera as funcionalidades e os ativos necessários para representar o fluxo principal do VitaLink.

| Dentro do escopo            | Descrição                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| Cadastro de pacientes       | Identificação e criação da conta do paciente.                                                |
| Cadastro de profissionais   | Identificação e criação de conta profissional.                                               |
| Autenticação                | Entrada no sistema por pacientes e profissionais.                                            |
| Perfis e permissões         | Separação das operações permitidas para cada tipo de usuário.                                |
| Documentos médicos          | Exames, laudos, receitas, imagens e outros documentos relacionados ao histórico do paciente. |
| Histórico médico            | Consulta às informações médicas mantidas pelo paciente.                                      |
| Solicitação de acesso       | Pedido realizado por um profissional para consultar informações de um paciente.              |
| Consentimento e autorização | Decisão do paciente sobre concessão, escopo e duração do acesso.                             |
| Revogação de acesso         | Encerramento de uma autorização concedida anteriormente.                                     |
| Registro de consultas       | Inclusão de informações relacionadas aos atendimentos.                                       |
| Auditoria                   | Registro de acessos e operações relevantes para permitir rastreabilidade.                    |
| API e banco de dados        | Componentes necessários para processar e armazenar as informações do sistema.                |
| Armazenamento de documentos | Componente responsável pelos arquivos médicos enviados ao VitaLink.                          |
| Modelagem de ameaças        | Identificação de ameaças por meio do STRIDE.                                                 |
| Casos de abuso              | Representação de comportamentos maliciosos ou usos indevidos do sistema.                     |
| Análise de riscos           | Avaliação posterior das ameaças identificadas e definição de tratamentos.                    |

## 5. Fora do escopo

Algumas funcionalidades possíveis para um sistema real de saúde não fazem parte do escopo atual do VitaLink.

| Fora do escopo                             | Justificativa                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Integração com hospitais e clínicas reais  | Exigiria sistemas externos e padrões de integração não necessários para a análise atual. |
| Integração com sistemas públicos de saúde  | Não é necessária para os objetivos da disciplina.                                        |
| Uso de dados médicos reais                 | O projeto deve utilizar apenas dados fictícios ou de demonstração.                       |
| Emissão oficial de receitas médicas        | Envolve requisitos legais e operacionais que excedem o escopo acadêmico.                 |
| Assinatura digital de documentos médicos   | Pode ser considerada futuramente, mas não é requisito do escopo atual.                   |
| Telemedicina                               | Não faz parte do fluxo principal analisado.                                              |
| Pagamentos e faturamento                   | Não estão relacionados aos objetivos de segurança definidos para o projeto.              |
| Inteligência Artificial para diagnóstico   | Não faz parte da proposta do VitaLink.                                                   |
| Integração com dispositivos médicos        | Não é necessária para a modelagem de ameaças prevista.                                   |
| Implementação de infraestrutura hospitalar | O VitaLink representa uma aplicação independente para fins acadêmicos.                   |

A exclusão desses elementos evita ampliar o projeto além do necessário e permite concentrar a análise nos problemas de segurança relacionados ao gerenciamento e compartilhamento de informações médicas.

## 6. Limites da análise

Nesta etapa, o VitaLink é tratado principalmente como objeto de análise e modelagem de segurança.

A documentação não pressupõe que mecanismos de autenticação, autorização, criptografia, auditoria ou armazenamento seguro já estejam implementados. Quando uma decisão de projeto ainda não estiver definida, ela deverá ser registrada como uma lacuna a ser resolvida nas etapas posteriores.

A implementação futura deverá refletir as decisões de segurança documentadas durante a modelagem.

## 7. Síntese

O VitaLink foi escolhido por combinar informações sensíveis, diferentes perfis de usuários, compartilhamento controlado de dados e necessidade de rastreabilidade.

O escopo definido permite analisar ameaças e riscos de forma concreta sem exigir a construção de um sistema médico completo. Assim, o projeto mantém o foco nos objetivos da disciplina: compreender como decisões de segurança podem ser incorporadas desde as etapas iniciais da Engenharia de Software.
