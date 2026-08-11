# Componentes e Arquitetura do VitaLink

Este documento descreve os principais elementos técnicos envolvidos no VitaLink, fundamentais para a análise e modelagem de ameaças.

## 1. Componentes do Sistema

### 1.1 Componentes Internos
| Componente | Função na Arquitetura |
| --- | --- |
| **Aplicação Web (Frontend)** | Interface onde usuários (pacientes e profissionais de saúde) interagem. É responsável por renderizar as informações e coletar as entradas iniciais, mas não toma decisões de segurança. |
| **API REST (Backend)** | Núcleo de processamento e principal fronteira de confiança. Recebe as requisições da Aplicação Web, valida regras de negócio e aplica rigorosamente o controle de acesso. |
| **Banco de Dados Relacional** | Armazena dados estruturados: cadastros (pacientes e profissionais), perfis, histórico de autorizações (consentimentos concedidos/revogados) e registros de auditoria (logs imutáveis). |
| **Armazenamento de Documentos (Storage)** | Serviço dedicado para armazenar arquivos físicos de forma protegida (imagens médicas, laudos, exames laboratoriais e receitas prescritas). |
| **Serviço de Autenticação** | Módulo responsável pelo ciclo de vida das identidades: gerencia login seguro, emissão, validação de tokens de sessão e recuperação de contas. |

### 1.2 Serviços Externos
| Componente | Função na Arquitetura |
| --- | --- |
| **Serviço de Notificações (E-mail/SMS)** | Serviço terceirizado responsável por disparar códigos de recuperação, e-mails de confirmação e alertas de segurança (ex: aviso ao paciente de que um prontuário foi acessado). |

---

## 2. Descrição Textual da Arquitetura Simplificada

A arquitetura do VitaLink foi desenhada para assegurar que informações médicas confidenciais circulem em um ambiente seguro e controlado. A interação dos pacientes e profissionais de saúde ocorre por meio de uma **Aplicação Web**, que serve exclusivamente como camada de apresentação para exibir informações e submeter requisições, operando fora da zona de confiança crítica.

O principal processador e agente de segurança do sistema é a **API REST**. A API atua como a fronteira de confiança primária: todas as ações (entradas e saídas de dados) devem obrigatoriamente cruzar essa fronteira. Ao receber uma requisição, a API realiza a validação com o **Serviço de Autenticação** para assegurar a identidade do perfil solicitante.

Uma vez confirmada a identidade, a API consulta o **Banco de Dados Relacional** para validar as matrizes de permissões e os consentimentos ativos associados àquele paciente. Se as condições forem favoráveis e a autorização for confirmada pelas regras de negócio, a API processa a leitura ou gravação solicitada.

Para casos de exames físicos, o modelo prevê que o arquivo resida em um **Armazenamento de Documentos (Storage)**, isolado atrás da API. Essa divisão garante que os metadados e os logs de auditoria permaneçam estruturados e rastreáveis no Banco de Dados, protegendo os arquivos pesados de qualquer acesso direto não autorizado. Por fim, a arquitetura inclui o acionamento de **Serviços Externos** (como APIs de e-mail e SMS) para alertar os pacientes e profissionais sobre acessos e ações sensíveis, mantendo o controle e a transparência em todo o processo.
