# Pontos de Interação e Fronteiras do Sistema

Este documento detalha as interações de entrada e saída **propostas** para o VitaLink e as fronteiras onde os controles deverão ser aplicados. Não descreve comportamento já implementado.

## 1. Pontos de Entrada de Dados

| Ponto de Interação                 | Fluxo de Dados e Componentes Envolvidos                                                                                                                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cadastro e Edição de Perfis**    | O paciente ou profissional insere seus dados pessoais na Aplicação Web. Esses dados entram no sistema através das rotas da API que validam o formato e os salvam no Banco de Dados.                                           |
| **Upload de Exames e Receitas**    | O usuário anexa um arquivo. O documento entra pela Aplicação Web e é transmitido para a API. A API direciona o arquivo bruto para o _Storage_ e salva os metadados (quem enviou, quando, de qual paciente) no Banco de Dados. |
| **Gerenciamento de Consentimento** | As decisões de acesso (aprovar ou bloquear um profissional) são entradas de dados submetidas pelo usuário na interface e consolidadas pela API no Banco de Dados.                                                             |
| **Registro de Atendimentos**       | O profissional de saúde insere resumo, recomendações e anotações clínicas sobre o paciente autorizado, enviando os textos por requisição para a API. O VitaLink não produz diagnóstico automático.                            |

---

## 2. Pontos de Saída e Compartilhamento

| Ponto de Interação                   | Fluxo de Dados e Componentes Envolvidos                                                                                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Consulta ao Histórico/Prontuário** | É uma requisição de leitura (saída). A Aplicação Web solicita as informações; a API compila os dados do Banco de Dados e os envia de volta à tela do usuário.                       |
| **Download e Leitura de Arquivos**   | Quando um exame precisa ser lido, a API busca a referência do documento no Banco, valida as permissões e recupera o arquivo diretamente do _Storage_ para entregar ao navegador.    |
| **Visualização Autorizada**          | O conteúdo é entregue somente após autenticação e autorização reavaliadas pela API. A primeira versão não possui compartilhamento público por link nem URL permanente de documento. |

---

## 3. Verificação de Autenticação e Autorização

A validação de segurança **não deve ocorrer apenas ocultando botões na interface do usuário (Aplicação Web)**. Todas as interações devem ser verificadas na principal fronteira de confiança da arquitetura: a API REST.

- **Autenticação:** Ocorre de forma centralizada na **API REST**, por módulo interno do FastAPI. A API resolve o cookie de sessão opaca, consulta no servidor seu hash, estado e expirações e identifica o usuário. Não existe token assinado nem serviço de autenticação separado nesta versão.
- **Autorização:** Imediatamente após a autenticação, e sempre antes de qualquer operação de entrada ou saída, a **API REST** cruza a identidade do usuário com as regras do **Banco de Dados**. Ela verifica o escopo e o consentimento: _Este usuário possui uma permissão Ativa para acessar este recurso neste exato momento?_
- **Acesso ao Storage:** O _Armazenamento de Documentos_ não pode estar exposto de forma pública ou acessível por requisições diretas do navegador sem proteção. Qualquer requisição a um arquivo precisa ser intermediada pela API, que só busca e devolve o arquivo físico após a confirmação rigorosa da Autorização.
