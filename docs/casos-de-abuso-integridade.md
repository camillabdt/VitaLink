# Casos de abuso de integridade

Este documento detalha os casos de abuso relacionados à alteração e à exclusão de documentos médicos no VitaLink, correspondentes à Issue #13. Os cenários complementam as ameaças T07, T08 e T09 da análise STRIDE e representam possibilidades de abuso, sem afirmar que essas vulnerabilidades existem em uma implementação.

## CA05 — Alteração maliciosa de exame

**Ator:** paciente, profissional de saúde mal-intencionado ou atacante que utiliza uma conta comprometida e consegue alcançar uma operação de criação, substituição ou atualização de documentos médicos.

**Objetivo:** inserir um exame falso ou modificar conteúdo, metadados ou vínculos de um exame existente para que uma informação clínica adulterada seja tratada como legítima.

### Condições necessárias

- o ator possui uma sessão autenticada ou alcança diretamente um ponto de interação da API;
- a aplicação aceita conteúdo, metadados ou identificadores informados pelo cliente sem validar completamente o paciente, o autor, o recurso e a operação;
- a autorização de escrita é inexistente, incompleta ou aplicada somente na interface;
- o documento pode ser substituído sem validação de integridade ou sem preservação da versão anterior;
- os registros de auditoria não permitem identificar com segurança o autor, o momento e o conteúdo alterado.

### Fluxo de abuso

1. O ator autentica uma conta legítima ou comprometida e acessa uma operação de envio ou atualização de exames.
2. O ator seleciona um exame existente ou informa o identificador de um paciente para o qual não possui autorização de escrita.
3. O ator envia um arquivo falso, modifica o resultado do exame ou altera metadados como paciente, data ou autoria.
4. A API verifica apenas a autenticação ou confia nos identificadores e metadados recebidos do cliente.
5. O sistema grava o conteúdo adulterado no banco de dados ou no armazenamento e deixa de preservar uma versão anterior recuperável.
6. O VitaLink apresenta o exame alterado como parte legítima do histórico médico do paciente.
7. A ausência de um evento de auditoria completo ou de um histórico de versões dificulta detectar a adulteração e restaurar o conteúdo correto.

### Falha de segurança explorada

O sistema não aplica autorização por paciente, recurso e operação no componente que controla a gravação, nem garante a integridade e o versionamento do documento. A ausência ou a fragilidade dos logs favorece o abuso porque impede comparar versões e atribuir a alteração a uma identidade e sessão confiáveis.

### Impacto

Um resultado falso ou adulterado pode orientar diagnóstico, medicamento ou procedimento inadequado, provocar repetição de exames e atrasar o atendimento. A impossibilidade de determinar qual versão é legítima reduz a confiança no prontuário e aumenta o esforço de investigação e recuperação.

### Ativos envolvidos

- **A03** — Dados médicos dos pacientes;
- **A04** — Exames, laudos e imagens médicas;
- **A08** — Registros de auditoria;
- **A09** — API;
- **A10** — Banco de dados;
- **A12** — Armazenamento de documentos.

### Ameaças relacionadas

- **T07 — Criação ou alteração indevida:** ameaça principal explorada pelo caso;
- **T09 — Negação de alteração realizada:** pode ocorrer quando os registros não permitem atribuir a adulteração ao autor;

### Categorias STRIDE

- **Tampering:** o conteúdo, os metadados ou os vínculos do exame são criados ou alterados indevidamente;
- **Repudiation:** o responsável pode negar a ação quando os registros de auditoria são ausentes, incompletos ou alteráveis.

---

## CA06 — Exclusão de registro para ocultar uma ação

**Ator:** paciente, profissional de saúde mal-intencionado, usuário privilegiado futuro ou atacante com acesso indevido a uma função de exclusão, ao banco de dados ou ao armazenamento.

**Objetivo:** excluir um laudo, exame, receita, consulta, referência ou registro de auditoria para ocultar uma ação anterior ou impedir que a informação seja usada no atendimento e na investigação.

### Condições necessárias

- o ator consegue identificar o registro ou documento que deseja remover;
- a exclusão é permitida sem autorização específica, confirmação adequada ou separação de responsabilidades;
- banco de dados e armazenamento não preservam uma versão recuperável ou podem ficar inconsistentes;
- os registros de auditoria podem ser omitidos, excluídos, alterados ou não vinculam o evento a uma identidade e sessão;
- não existe alerta ou revisão para exclusões de informações clínicas e evidências de auditoria.

### Fluxo de abuso

1. O ator realiza ou identifica uma ação que deseja ocultar, como a inclusão de informação incorreta ou um atendimento questionável.
2. O ator localiza o documento, a consulta ou a referência correspondente no VitaLink.
3. O ator solicita a exclusão pela API ou remove diretamente o arquivo, o registro ou o vínculo entre eles.
4. O sistema executa a operação sem verificar a autorização específica para excluir, sem confirmação adequada e sem preservar uma versão recuperável.
5. O ator remove ou altera também o evento de auditoria, ou o sistema deixa de registrar autor, horário, alvo, resultado e versão anterior.
6. O item desaparece do histórico médico e a ação anterior deixa de ser reconstruída de forma confiável.
7. O ator nega ter realizado a exclusão, e a equipe não encontra evidências íntegras suficientes para atribuir responsabilidade e restaurar o registro.

### Falha de segurança explorada

O sistema permite exclusão definitiva sem autorização granular, versionamento, restauração verificável e proteção dos registros de auditoria. A ausência de logs favorece diretamente o abuso: sem uma trilha independente e íntegra, a exclusão do documento também elimina ou enfraquece a evidência necessária para demonstrar quem realizou a ação.

### Impacto

Profissionais podem tomar decisões com um histórico incompleto, pacientes podem precisar repetir exames e prescrições ou atendimentos podem deixar de ser comprovados. Operacionalmente, a equipe perde tempo na investigação e recuperação. A falta de evidências prejudica a responsabilização, a confiança no prontuário e a distinção entre erro, fraude e comprometimento de conta.

### Ativos envolvidos

- **A03** — Dados médicos dos pacientes;
- **A04** — Exames, laudos e imagens médicas;
- **A05** — Receitas e prescrições médicas;
- **A08** — Registros de auditoria;
- **A09** — API;
- **A10** — Banco de dados;
- **A12** — Armazenamento de documentos.

### Ameaças relacionadas

- **T08 — Exclusão indevida:** ameaça principal explorada pelo caso;
- **T09 — Negação de alteração ou exclusão realizada:** ocorre quando a autoria não pode ser comprovada;

### Categorias STRIDE

- **Tampering:** a remoção altera indevidamente o estado e a completude do histórico médico;
- **Repudiation:** o autor consegue negar a exclusão quando não existe evidência íntegra e suficiente;

## Rastreabilidade

| Caso de abuso                                     | Ameaças relacionadas | Categorias STRIDE principais | Ativos principais                  | Riscos relacionados |
| ------------------------------------------------- | -------------------- | ---------------------------- | ---------------------------------- | ------------------- |
| CA05 — Alteração maliciosa de exame               | T07 e T09            | Tampering e Repudiation      | A03, A04, A08, A09, A10 e A12      | R07 e R09           |
| CA06 — Exclusão de registro para ocultar uma ação | T08 e T09            | Tampering e Repudiation      | A03, A04, A05, A08, A09, A10 e A12 | R08 e R09           |

Os controles e riscos residuais relacionados são tratados na [Etapa 2](etapa2-riscos-e-tratamento.md). A existência de controles efetivos ainda depende de implementação e evidências técnicas.
