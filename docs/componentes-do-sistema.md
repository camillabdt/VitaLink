# Componentes e Arquitetura do VitaLink

Este documento descreve a arquitetura de referência do VitaLink para apoiar a análise e a modelagem de ameaças. A aplicação local implementa frontend React, API FastAPI, PostgreSQL, MinIO, ClamAV, Mailpit e transcrição local. O proxy HTTPS e a implantação de produção permanecem fora da comprovação atual.

## 1. Componentes do Sistema

### 1.1 Componentes Internos

| Componente                                | Função na Arquitetura                                                                                                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aplicação Web (Frontend)**              | Interface onde usuários (pacientes e profissionais de saúde) interagem. É responsável por renderizar as informações e coletar as entradas iniciais, mas não toma decisões de segurança. |
| **API REST (Backend)**                    | Núcleo de processamento e principal fronteira de confiança. Recebe as requisições da Aplicação Web, valida regras de negócio e aplica rigorosamente o controle de acesso.               |
| **Banco de Dados Relacional**             | Armazena dados estruturados: cadastros, perfis, histórico de autorizações e registros de auditoria. A proteção contra alteração dos registros é um requisito proposto.                  |
| **Armazenamento de Documentos (Storage)** | Serviço dedicado para armazenar arquivos físicos de forma protegida (imagens médicas, laudos, exames laboratoriais e receitas prescritas).                                              |
| **Módulo de Autenticação da API**         | Parte interna do FastAPI responsável por login, sessões opacas, TOTP e recuperação. Não é serviço separado e não emite token assinado na primeira versão.                               |
| **Proxy HTTPS**                           | Ponto de entrada que encerra TLS e encaminha frontend e API sem expor os serviços internos.                                                                                             |
| **Varredura de Arquivos**                 | Serviço local que verifica arquivos em quarentena antes de disponibilizá-los.                                                                                                           |
| **Transcrição Local**                     | Serviço que transforma áudio temporário em rascunho textual e descarta a gravação.                                                                                                      |

### 1.2 Serviço auxiliar de desenvolvimento

| Componente                  | Função na Arquitetura                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| **Captura local de e-mail** | Recebe confirmações, recuperações e alertas sem enviar mensagens para provedores externos. |

---

## 2. Descrição Textual da Arquitetura Simplificada

Na arquitetura implementada localmente, pacientes e profissionais interagem por uma **Aplicação Web**, que serve como camada de apresentação para exibir informações e submeter requisições. Ela não toma decisões de segurança.

O principal processador e agente de segurança é a **API REST**. Todas as ações protegidas cruzam essa fronteira. O módulo interno de autenticação resolve no servidor a sessão opaca e identifica o solicitante antes das regras de autorização.

Uma vez confirmada a identidade, a API consulta o **Banco de Dados Relacional** para validar as matrizes de permissões e os consentimentos ativos associados àquele paciente. Se as condições forem favoráveis e a autorização for confirmada pelas regras de negócio, a API processa a leitura ou gravação solicitada.

Os arquivos residem em **Armazenamento de Documentos (Storage)** privado, isolado atrás da API e separado entre quarentena e conteúdo aprovado. Essa divisão mantém metadados e logs de auditoria estruturados no Banco de Dados e impede acesso direto ao arquivo. Na primeira versão, confirmações, recuperações e alertas por e-mail permanecem no ambiente local de desenvolvimento.

Os componentes, tecnologias e limites da entrega estão detalhados no [plano de implementação da primeira versão](implementacao-segura/plano-implementacao-primeira-versao.md).
