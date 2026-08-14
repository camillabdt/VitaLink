# Inventário da interface da primeira versão

## Status e baseline

Este inventário transforma a exigência de “todas as telas funcionais” em critérios verificáveis. O [Figma Make](https://www.figma.com/make/R6iSKm93eoSuJrjb8eXZu7/VitaLink-Health-Management-App?p=f&t=mhS5qcfMxCj4rkGz-0) e o código em `VitaLink Health Management App/` são a baseline visual e de interação. O código atual contém dados simulados e rotas convergentes; ele deve ser reutilizado como ponto de partida, não tratado como comportamento implementado.

Segurança, domínio e acessibilidade prevalecem quando exigirem mudança em relação ao protótipo. Toda mudança relevante deve ser mencionada na issue e demonstrada na revisão visual.

### Progresso da issue #50

O cadastro, a confirmação de e-mail, a ativação TOTP, o login e o logout do paciente estão conectados à API e cobertos por testes. Login profissional, recuperação e as demais telas permanecem associados às issues indicadas neste inventário. Para evitar controles simulados visíveis, os seletores profissionais foram retirados temporariamente dos formulários desta fatia e retornam com comportamento real na issue #52. Consulte a [evidência de implementação](implementacao-issue-50.md).

### Progresso da issue #51

A recuperação de senha, a recuperação reforçada do TOTP, a troca de senha com step-up, a listagem e o encerramento de sessões próprias e o direcionamento de Configurações estão conectados à API. Os temporizadores, sessões fixas e botões inertes desses trechos foram removidos. A recuperação automática reforçada é exclusiva do paciente; profissional retorna à validação manual. Consulte a [evidência da issue #51](implementacao-issue-51.md).

### Progresso da issue #52

O cadastro profissional, a confirmação de e-mail, a ativação TOTP, a decisão manual auditada e o login após aprovação estão conectados à API. Os seletores profissionais retornaram aos formulários com comportamento real. Contas pendentes ou rejeitadas recebem estado explícito sem sessão, e a rota após login usa o perfil informado pelo servidor. Consulte a [evidência da issue #52](implementacao-issue-52.md).

## Telas e destinos

| Destino                     | Baseline local                                           | Decisão para a primeira versão                              | Comportamento verificável                                                                    |
| --------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Login                       | `components/auth/LoginPage.tsx`                          | Manter e integrar                                           | Entrar como paciente ou profissional com senha e TOTP, sem revelar existência de conta.      |
| Cadastro                    | `components/auth/RegisterPage.tsx`                       | Manter e separar estados                                    | Cadastrar o perfil escolhido, confirmar e-mail e seguir para ativação restrita do TOTP.      |
| Recuperação                 | `components/auth/ForgotPasswordPage.tsx`                 | Manter e completar                                          | Solicitar recuperação, concluir senha e, quando necessário, recuperação reforçada.           |
| Confirmação e ativação TOTP | Tipos `reset-confirmation` e fluxo de cadastro           | Substituir simulação por telas funcionais                   | Confirmar e-mail, cadastrar TOTP, exibir uma vez os códigos e encerrar a sessão restrita.    |
| Início do paciente          | `components/patient/PatientDashboard.tsx`                | Manter composição e ligar à API                             | Exibir resumo persistido, notificações e ações reais dentro do escopo.                       |
| Histórico do paciente       | `patient-history`, hoje resolvido pelo dashboard         | Criar destino funcional reutilizando componentes existentes | Listar consultas, observações, resultados e documentos com filtros persistentes.             |
| Gráficos                    | `patient-charts`, hoje resolvido pelo dashboard          | Criar destino funcional                                     | Exibir somente resultados estruturados confirmados, unidade, origem e referências separadas. |
| Recomendações               | `patient-recommendations`, hoje resolvido pelo dashboard | Criar destino funcional                                     | Listar recomendações por autor sem tratá-las como diagnóstico ou prescrição.                 |
| Perfil do paciente          | `components/patient/PatientProfile.tsx`                  | Manter e integrar                                           | Editar campos permitidos, segurança, sessões, códigos e autorizações próprias.               |
| Importação                  | `components/exam/ImportExamPage.tsx`                     | Manter visual e substituir simulações                       | Enviar PDF/JPG/PNG, acompanhar quarentena e registrar resultado manual confirmado.           |
| Pacientes do profissional   | `components/doctor/DoctorDashboard.tsx`                  | Manter e integrar                                           | Listar, buscar e filtrar somente pacientes com autorização ativa.                            |
| Detalhe do paciente         | `doctor-patient-detail`, dentro do dashboard             | Separar estado funcional reutilizando o painel              | Consultar e registrar apenas recursos e operações autorizados.                               |
| Mensagens profissionais     | `doctor-messages`, dentro do dashboard                   | Manter visual e integrar                                    | Listar, enviar e corrigir mensagens quando os dois profissionais possuírem escopo adequado.  |
| Perfil profissional         | `doctor-profile`, hoje resolvido pelo dashboard          | Criar destino funcional                                     | Editar campos permitidos e gerenciar segurança sem alterar dados já validados.               |
| Notificações                | Sino em `components/shared/Layout.tsx`                   | Transformar em caixa funcional                              | Abrir, listar e marcar notificações próprias como lidas.                                     |
| Configurações               | Botão sem ação em `components/shared/Sidebar.tsx`        | Direcionar ao perfil/configurações do usuário               | Abrir configurações reais de perfil, segurança e sessões; não criar tela duplicada.          |
| Logout                      | `Sidebar.tsx` e estado de `App.tsx`                      | Manter aparência e integrar                                 | Encerrar a sessão no servidor e voltar ao login.                                             |

## Controles transversais

- Todo botão, link, aba, ícone acionável, filtro e formulário visível deve executar comportamento real ou ser removido.
- Login social, passkey, biometria, agenda, OCR, DICOM e compartilhamento público por link são removidos.
- O botão de microfone aparece somente em texto clínico livre do profissional e sempre mantém digitação manual.
- Dados exibidos vêm da API; o frontend não conserva mocks ou temporizadores como fonte de estado funcional.
- Ações indisponíveis por autorização são explicadas sem revelar dados; esconder o controle não substitui a negação da API.

## Mapeamento dos controles observados no código

O mapeamento abaixo foi produzido pela inspeção dos 13 componentes TSX em `VitaLink Health Management App/src/components/`. A coluna “Destino” indica as issues #50–#66 publicadas no GitHub para implementação e validação.

| Componente da baseline                          | Controles e estados observados                                                                                                                                                          | Decisão                                                                                                                                                      | Destino                            |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| `auth/LoginPage.tsx`                            | Alternância paciente/profissional, e-mail, senha, mostrar senha, esqueci a senha, criar conta, identificação profissional, seleção de método, TOTP e progresso de sessão.               | Conectar senha+TOTP e estados reais. Remover login social, biometria, ICP-Brasil, token/smart card e temporizadores simulados.                               | #50, #51 e #52                     |
| `auth/RegisterPage.tsx`                         | Alternância de perfil, dados pessoais, CPF, telefone, nascimento, sexo, tipo sanguíneo, senha/confirmação, CRM, UF, especialidade, instituição, voltar e concluir.                      | Conectar validação, cadastro, confirmação de e-mail, ativação TOTP e pendência profissional; ajustar mínimo de senha para 12.                                | #50 e #52                          |
| `auth/ForgotPasswordPage.tsx`                   | E-mail, envio, reenviar/corrigir e voltar ao login.                                                                                                                                     | Conectar resposta anti-enumeração, Mailpit, redefinição e recuperação reforçada.                                                                             | #51                                |
| `patient/PatientDashboard.tsx`                  | Abas visão geral, documentos, consultas, gráficos e recomendações; novo exame, ver todos, filtros, upload, visualizar, baixar e formulário de consulta.                                 | Alimentar pela API. Remover criação de consulta pelo paciente e converter somente o registro pessoal previsto; conectar histórico, gráficos e recomendações. | #57, #58, #59, #60, #61 e #64      |
| `patient/PatientProfile.tsx`                    | Voltar, editar perfil, abas dados pessoais/profissionais autorizados/segurança, observação pessoal, revogar profissional, copiar código, atualizar senha, ativar 2FA e encerrar sessão. | Conectar todos os controles; copiar apenas código temporário real; aplicar confirmação e auditoria em revogação e segurança.                                 | #51, #53, #54, #56 e #57           |
| `doctor/DoctorDashboard.tsx` — lista            | Busca, filtros de estado, cards de pacientes, ver agenda e novo paciente.                                                                                                               | Busca e filtros usam apenas pacientes autorizados. “Novo paciente” passa a consumir código temporário. “Ver agenda” é removido.                              | #54 e #55                          |
| `doctor/DoctorDashboard.tsx` — solicitação      | Busca simulada por nome/CPF, justificativa e envio.                                                                                                                                     | Proibir busca por nome/CPF e substituir pelo consumo de código temporário com dados mínimos.                                                                 | #54                                |
| `doctor/DoctorDashboard.tsx` — detalhe          | Voltar, ligar, agendar consulta, abas visão geral/exames/consultas/equipe, nota, anexar, áudio, assinar e publicar.                                                                     | Remover ligar, agenda e assinatura. Conectar consulta, recomendação, documento, ditado, confirmação TOTP e autorização granular.                             | #55, #58, #60, #61 e #63           |
| `doctor/DoctorDashboard.tsx` — referências      | Expandir referência, remover e adicionar nome, mínimo, máximo, unidade e justificativa.                                                                                                 | Tratar como meta clínica versionada por profissional; impedir média automática e exclusão física.                                                            | #61                                |
| `doctor/DoctorDashboard.tsx` — documentos       | Filtros, adicionar arquivo, nome, tipo, observação, remover seleção, cancelar, salvar, ver e visualizar.                                                                                | Restringir tipos, remover DICOM, aplicar quarentena/ClamAV e autorização. Correção cria versão; conteúdo não é sobrescrito.                                  | #58 e #60                          |
| `doctor/DoctorDashboard.tsx` — consultas        | Exibir, abrir formulário, motivo, data, observação, cancelar e salvar.                                                                                                                  | Criar consulta clínica profissional, com autoria, proveniência, autorização e correção versionada.                                                           | #60                                |
| `doctor/DoctorDashboard.tsx` — equipe/mensagens | Buscar profissional, selecionar conversa, responder, ver histórico, menções, microfone e enviar.                                                                                        | Exigir escopo `mensagens` dos dois profissionais; conectar histórico, correção imutável, menções e ditado.                                                   | #55, #62 e #63                     |
| `exam/ImportExamPage.tsx`                       | Arrastar/selecionar arquivo, exemplo simulado, progresso, campos “extraídos”, confirmar todos, editar/remover linhas, entrada manual, adicionar resultado, salvar e concluir.           | Remover exemplo e extração/OCR simulados. Manter o padrão visual para upload real e registro manual confirmado; ações de linha tornam-se funcionais.         | #58 e #59                          |
| `shared/DocumentUploadModal.tsx`                | Tipo, arrastar/selecionar, remover arquivo, nome, profissional, data, observação, cancelar e salvar.                                                                                    | Remover `.dcm`, validar PDF/JPG/PNG, não confiar no tipo do navegador e conectar upload seguro.                                                              | #58                                |
| `shared/DocumentViewerModal.tsx`                | Baixar, compartilhar com médico, fechar e baixar imagem original.                                                                                                                       | Download exige autorização, auditoria e step-up. Substituir compartilhamento público por visualização dos profissionais cobertos por autorização ativa.      | #55 e #58                          |
| `shared/StepUpAuthModal.tsx`                    | Escolha de biometria, TOTP ou ICP, confirmação e cancelamento.                                                                                                                          | Manter somente TOTP vinculado à ação por cinco minutos; remover biometria, ICP e token/smart card.                                                           | #51, #55, #56, #58, #60, #61 e #62 |
| `shared/Layout.tsx`                             | Abrir menu móvel e sino de notificações.                                                                                                                                                | Manter menu responsivo e conectar sino à caixa persistente.                                                                                                  | #64                                |
| `shared/Sidebar.tsx`                            | Navegação, perfil resumido, badge de mensagens, configurações e sair.                                                                                                                   | Conectar rotas reais, badge persistido, configurações ao perfil/segurança e logout no servidor.                                                              | #51, #53, #62 e #64                |
| `shared/MentionTextarea.tsx`                    | Texto, sugestões de profissionais, teclado e seleção de menção.                                                                                                                         | Manter padrão visual e conectar apenas profissionais elegíveis para o mesmo paciente.                                                                        | #62                                |

Controles sem `onClick`, com `onClick={() => {}}`, temporizadores, dados de `mockData.ts` ou mudanças apenas em estado local não são considerados implementados. Cada issue deve remover esses comportamentos simulados no trecho que colocar em produção.

## Estados obrigatórios

Cada destino assíncrono deve definir e testar:

- carregamento sem deslocamento excessivo de layout;
- estado vazio com próxima ação válida;
- sucesso persistido após recarregar;
- erro de validação associado ao campo;
- falha transitória com tentativa segura;
- sessão expirada;
- acesso negado sem exposição do recurso;
- indisponibilidade de serviço dependente quando aplicável.

## Fidelidade visual e acessibilidade

As issues com frontend devem citar os arquivos da baseline local que reutilizam e incluir comparação nos viewports de 390 × 844, 768 × 1024 e 1440 × 900. Devem preservar tokens de cor, tipografia, espaçamento, bordas, hierarquia, sidebar, cards e padrões de formulário do protótipo, ressalvados ajustes documentados.

A verificação inclui navegação por teclado, foco visível, nomes acessíveis, associação de erros, contraste, zoom de 200%, layout responsivo e ausência de comunicação apenas por cor. Regressão visual complementa, mas não substitui, testes de comportamento e acessibilidade.

## Contrato para issues

Toda issue que altera frontend deve conter:

1. tela, rota e comportamento entregues;
2. arquivos ou componentes correspondentes em `VitaLink Health Management App/` usados como baseline;
3. controles que serão conectados, removidos ou substituídos;
4. estados obrigatórios cobertos;
5. critérios de fidelidade visual e acessibilidade;
6. ciclo TDD pela interface pública e testes de regressão acumulados.

Uma tela não é considerada funcional por apenas renderizar ou navegar. Ela precisa concluir sua jornada com API, persistência, autorização, auditoria e respostas de erro compatíveis com o comportamento.
