# Casos de abuso de identidade

Este documento detalha os casos de abuso relacionados à identidade e à autenticação no VitaLink. Os cenários complementam as ameaças T01, T02 e T03 da análise STRIDE e descrevem situações possíveis de abuso sem afirmar que essas vulnerabilidades já existem na implementação.

## CA01 — Cadastro de falso profissional

**Ator:** pessoa mal-intencionada que não possui uma identidade profissional válida ou que utiliza dados pertencentes a outro profissional.

**Objetivo:** criar uma conta que seja reconhecida pelo VitaLink como pertencente a um profissional de saúde legítimo para ganhar a confiança de pacientes e solicitar acesso a informações médicas.

### Condições necessárias

- o ator consegue iniciar um cadastro como profissional de saúde;
- os dados utilizados no cadastro não correspondem à identidade ou à habilitação real do ator;
- a validação da identidade e do registro profissional é inexistente, incompleta ou insuficiente;
- o sistema permite que a conta seja utilizada como perfil profissional após o cadastro.

### Fluxo de abuso

1. O atacante acessa a funcionalidade de cadastro de profissional.
2. Informa dados profissionais falsos ou pertencentes a outra pessoa.
3. O VitaLink recebe os dados enviados para criação da conta.
4. A validação da identidade ou da habilitação profissional não detecta a inconsistência.
5. O sistema cria uma conta com perfil de profissional de saúde.
6. O atacante autentica a conta criada.
7. O atacante solicita acesso aos dados médicos de um paciente.
8. O paciente visualiza o perfil como se pertencesse a um profissional legítimo e pode conceder autorização.
9. Caso a autorização seja concedida, o atacante passa a consultar ou realizar operações dentro do escopo disponibilizado ao falso perfil.

### Falha de segurança explorada

O sistema confia nos dados informados durante o cadastro sem possuir uma verificação suficiente de que a identidade e a habilitação profissional pertencem realmente à pessoa que está criando a conta.

A primeira versão mantém a conta profissional sem acesso até a validação manual auditada, conforme a evidência da issue #52. Integração automática com conselho de classe e KYC fica fora do escopo da primeira versão.

### Impacto

O paciente pode fornecer acesso a informações sensíveis acreditando estar interagindo com um profissional legítimo.

Entre os possíveis impactos estão:

- exposição de dados médicos;
- exposição de exames, laudos, receitas e imagens;
- associação de atendimentos ou documentos a um falso profissional;
- perda de confiança no sistema;
- utilização indevida de permissões concedidas pelo paciente.

### Ativos envolvidos

- **A02** — Dados dos profissionais de saúde;
- **A03** — Dados médicos dos pacientes;
- **A04** — Exames, laudos e imagens médicas;
- **A05** — Receitas e prescrições médicas;
- **A06** — Credenciais de autenticação;
- **A09** — API;
- **A12** — Armazenamento de documentos.

### Ameaças relacionadas

- **T01 — Falso profissional:** ameaça principal explorada neste caso.
- **T03 — Elevação indevida de perfil ou privilégio:** pode ocorrer quando o falso perfil recebe capacidades que deveriam pertencer somente a um profissional legítimo.

### Categorias STRIDE

- **Spoofing:** o atacante se apresenta como uma identidade profissional legítima.
- **Elevation of Privilege:** pode ocorrer caso o falso perfil obtenha operações reservadas a profissionais autorizados.

---

## CA02 — Roubo da conta de um paciente

**Ator:** atacante que consegue obter uma credencial, token ou sessão pertencente a um paciente.

**Objetivo:** assumir a identidade do paciente no VitaLink e utilizar as funcionalidades disponíveis para a vítima.

### Condições necessárias

- existe uma conta válida de paciente;
- o atacante obtém uma senha, token de sessão, token de recuperação ou outro elemento utilizado para autenticação;
- o material obtido continua válido no momento do ataque;
- o VitaLink aceita esse material como evidência suficiente para associar a sessão ao paciente.

### Fluxo de abuso

1. Um paciente possui uma conta válida no VitaLink.
2. O atacante obtém uma credencial ou token relacionado à conta.
3. O atacante utiliza a credencial ou token para iniciar ou reutilizar uma sessão.
4. O VitaLink associa a sessão autenticada à identidade do paciente.
5. O atacante acessa as funcionalidades disponibilizadas para aquela conta.
6. O atacante consulta informações médicas e documentos armazenados.
7. O atacante pode alterar informações permitidas ao paciente, manipular autorizações ou compartilhar dados.
8. As ações realizadas podem ficar registradas como se tivessem sido executadas pelo próprio paciente.

### Falha de segurança explorada

O ataque utiliza uma evidência de autenticação comprometida pertencente a uma conta legítima.

O VitaLink protege credenciais e sessões com Argon2, TOTP, cookies opacos, recuperação reforçada, limites e encerramento de sessões, com cobertura nas rotas de conta e nos testes correspondentes.

### Impacto

O atacante passa a agir em nome do paciente e pode acessar informações privadas ou modificar decisões relacionadas à própria conta.

Entre os possíveis impactos estão:

- exposição do histórico médico;
- acesso a exames, receitas, laudos e imagens;
- alteração de dados do perfil;
- compartilhamento indevido de informações;
- concessão ou revogação indevida de autorizações;
- dificuldade de responsabilização caso as ações sejam registradas como pertencentes ao paciente;
- perda temporária ou permanente do controle da conta.

### Ativos envolvidos

- **A01** — Dados pessoais dos pacientes;
- **A03** — Dados médicos dos pacientes;
- **A04** — Exames, laudos e imagens médicas;
- **A05** — Receitas e prescrições médicas;
- **A06** — Credenciais de autenticação;
- **A07** — Tokens;
- **A08** — Registros de auditoria;
- **A09** — API;
- **A10** — Banco de dados.

### Ameaças relacionadas

- **T02 — Uso de credenciais roubadas:** ameaça principal explorada neste caso.
- **T03 — Elevação indevida de perfil ou privilégio:** pode ocorrer se o atacante utilizar a conta comprometida para alcançar recursos ou operações além do escopo que deveria possuir.

### Categorias STRIDE

- **Spoofing:** o atacante utiliza a conta e se apresenta ao sistema como o paciente legítimo.
- **Elevation of Privilege:** pode ocorrer caso o comprometimento seja utilizado para alcançar operações ou recursos não autorizados.

---

## Rastreabilidade

| Caso de abuso                         | Ameaças relacionadas | Categoria STRIDE principal | Ativos principais                            |
| ------------------------------------- | -------------------- | -------------------------- | -------------------------------------------- |
| CA01 — Cadastro de falso profissional | T01 e T03            | Spoofing                   | A02, A03, A04, A05, A06, A09 e A12           |
| CA02 — Roubo da conta de um paciente  | T02 e T03            | Spoofing                   | A01, A03, A04, A05, A06, A07, A08, A09 e A10 |

## Observação

Os casos descrevem cenários de abuso utilizados para a modelagem de segurança. Eles não afirmam que o VitaLink já possui essas vulnerabilidades implementadas. Os controles de prevenção, detecção e resposta serão definidos e avaliados nas etapas posteriores de análise de riscos.
