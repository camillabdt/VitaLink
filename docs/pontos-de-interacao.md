# Pontos de Interação e Fronteiras do Sistema

Este documento detalha as interações de entrada e saída do VitaLink, além de definir as fronteiras onde a segurança é aplicada.

## 1. Pontos de Entrada de Dados

- **Cadastro e Edição de Perfis:** O paciente ou profissional insere seus dados pessoais na Aplicação Web. Esses dados entram no sistema através das rotas da API que validam o formato e os salvam no Banco de Dados.
- **Upload de Exames e Receitas:** O usuário anexa um arquivo. O documento entra pela Aplicação Web e é transmitido para a API. A API direciona o arquivo bruto para o *Storage* e salva os metadados (quem enviou, quando, de qual paciente) no Banco de Dados.
- **Gerenciamento de Consentimento (Solicitação, Concessão, Revogação):** As decisões de acesso (aprovar ou bloquear um profissional) são entradas de dados submetidas pelo usuário na interface e consolidadas pela API no Banco de Dados.
- **Registro de Atendimentos Clínicos:** O profissional de saúde insere diagnósticos e anotações sobre o paciente autorizado, enviando os textos por requisição para a API.

---

## 2. Pontos de Saída e Compartilhamento

- **Consulta ao Histórico e Prontuário:** É uma requisição de leitura (saída). A Aplicação Web solicita as informações; a API compila os dados do Banco de Dados e os envia de volta à tela do usuário.
- **Download / Visualização de Arquivos:** Quando um exame precisa ser lido, a API busca a referência do documento no Banco, valida as permissões e recupera o arquivo diretamente do *Storage* para entregar ao navegador.
- **Compartilhamento por Link (Acesso Externo):** O sistema emite um URL (link temporário ou permanente) que, quando acessado por um terceiro (mesmo fora do sistema), expõe o documento médico como saída de dados pública ou semi-pública.

---

## 3. Verificação de Autenticação e Autorização

A validação de segurança **não deve ocorrer apenas ocultando botões na interface do usuário (Aplicação Web)**. Todas as interações devem ser verificadas na principal fronteira de confiança da arquitetura: a API REST.

- **Autenticação:** Ocorre de forma centralizada na **API REST**, que valida a assinatura e a validade do Token com o **Serviço de Autenticação** a cada nova requisição, garantindo a identidade (*quem é o usuário*).
- **Autorização:** Imediatamente após a autenticação, e sempre antes de qualquer operação de entrada ou saída, a **API REST** cruza a identidade do usuário com as regras do **Banco de Dados**. Ela verifica o escopo e o consentimento: *Este usuário possui uma permissão Ativa para acessar este recurso neste exato momento?*
- **Acesso ao Storage:** O *Armazenamento de Documentos* não pode estar exposto de forma pública ou acessível por requisições diretas do navegador sem proteção. Qualquer requisição a um arquivo precisa ser intermediada pela API, que só busca e devolve o arquivo físico após a confirmação rigorosa da Autorização.
