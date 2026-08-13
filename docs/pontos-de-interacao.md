# Pontos de Interação e Fronteiras do Sistema

Este documento detalha as interações de entrada e saída do VitaLink, além de definir as fronteiras onde a segurança é aplicada.

Os pontos e fluxos abaixo representam o modelo proposto e não comprovam comportamento implementado.

## 1. Pontos de Entrada de Dados

| Ponto de Interação | Fluxo de Dados e Componentes Envolvidos |
| --- | --- |
| **Cadastro e Edição de Perfis** | O paciente ou profissional insere seus dados pessoais na Aplicação Web. Esses dados entram no sistema através das rotas da API que validam o formato e os salvam no Banco de Dados. |
| **Upload de Exames e Receitas** | O usuário anexa um arquivo. O documento entra pela Aplicação Web e é transmitido para a API. A API direciona o arquivo bruto para o *Storage* e salva os metadados (quem enviou, quando, de qual paciente) no Banco de Dados. |
| **Gerenciamento de Consentimento** | As decisões de acesso (aprovar ou bloquear um profissional) são entradas de dados submetidas pelo usuário na interface e consolidadas pela API no Banco de Dados. |
| **Registro de Atendimentos** | O profissional de saúde insere diagnósticos e anotações sobre o paciente autorizado, enviando os textos por requisição para a API. |

---

## 2. Pontos de Saída e Compartilhamento

| Ponto de Interação |  Fluxo de Dados e Componentes Envolvidos |
| --- | --- |
| **Consulta ao Histórico/Prontuário** | É uma requisição de leitura (saída). A Aplicação Web solicita as informações; a API compila os dados do Banco de Dados e os envia de volta à tela do usuário. |
| **Download e Leitura de Arquivos** | Quando um exame precisa ser lido, a API busca a referência do documento no Banco, valida as permissões e recupera o arquivo diretamente do *Storage* para entregar ao navegador. |
| **Compartilhamento por Link** | O sistema pode emitir um link temporário contendo um identificador imprevisível, destinado ao compartilhamento controlado de um documento específico. O link não expõe diretamente o *Storage*: o acesso é sempre processado pela API. O link possui prazo de expiração, pode ser revogado pelo paciente e cada utilização deve ser registrada para auditoria. Para um terceiro sem conta no VitaLink, o identificador do link funciona como uma credencial de capacidade limitada exclusivamente ao recurso compartilhado. |

---

## 3. Verificação de Autenticação e Autorização

A validação de segurança **não deve ocorrer apenas ocultando botões na interface do usuário (Aplicação Web)**. Todas as interações devem ser verificadas na principal fronteira de confiança da arquitetura: a API REST.

- **Autenticação:** Ocorre de forma centralizada na **API REST**, que valida a assinatura e a validade do Token com o **Serviço de Autenticação** a cada nova requisição, garantindo a identidade (*quem é o usuário*).
- **Autorização:** Para pacientes e profissionais autenticados, imediatamente após a autenticação e antes de qualquer operação de entrada ou saída, a **API REST** cruza a identidade do usuário com as regras do **Banco de Dados**, verificando escopo, consentimento e estado da permissão. No fluxo excepcional de compartilhamento por link, a API valida a credencial de capacidade associada ao link, incluindo recurso autorizado, validade e estado de revogação, antes de liberar o documento.
- **Acesso ao Storage:** O *Armazenamento de Documentos* não pode estar exposto de forma pública ou acessível por requisições diretas do navegador sem proteção. Qualquer requisição a um arquivo precisa ser intermediada pela API, que só busca e devolve o arquivo físico após a confirmação rigorosa da Autorização.
