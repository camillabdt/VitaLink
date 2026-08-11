# Etapa 1 — Modelagem de ameaças e casos de abuso

## Status e escopo

Este é o índice rastreável da Etapa 1. Ele consolida os documentos de ameaças já versionados sem substituir seus detalhes. As ameaças são cenários possíveis, não achados de implementação. Controles, testes e evidências técnicas permanecem **[A confirmar]** quando não existem no repositório.

O VitaLink é uma proposta de sistema para pacientes manterem informações médicas e autorizarem profissionais de saúde a acessá-las em escopo e período definidos. Os perfis, ativos e fluxo consultados nesta análise estão em [perfis e permissões](usuarios-perfis-e-permissoes.md), [inventário de ativos](inventario-de-ativos.md), [classificação CIA](classificacao-cia-dos-ativos.md) e [autorização e revogação](fluxo-autorizacao-revogacao.md).

## Cobertura STRIDE

| ID | STRIDE | Cenário contextualizado | Ativos | Caso de abuso |
| --- | --- | --- | --- | --- |
| T01 | Spoofing | Pessoa se apresenta como profissional sem identidade ou habilitação válida. | A02, A03–A06, A09, A12 | CA01 |
| T02 | Spoofing | Credencial ou token obtido por atacante é usado como se pertencesse à vítima. | A03–A10 | CA02 |
| T03 | Elevation of Privilege | Solicitação manipulada alcança perfil, paciente, recurso ou operação fora do privilégio. | A03–A10 | CA01, CA02, CA04 |
| T04 | Information Disclosure | Dados médicos são consultados sem autorização ativa para paciente, recurso e operação. | A03–A05, A08–A10, A12 | CA04 |
| T05 | Information Disclosure; Elevation of Privilege | Sessão ou decisão antiga permite acesso após revogação ou expiração. | A03–A10 | CA03 |
| T06 | Elevation of Privilege; Information Disclosure | Autorização limitada é ampliada para outro dado, paciente ou operação. | A03–A05, A08–A10, A12 | CA04 |
| T13 | Denial of Service | Volume de requisições esgota capacidade da API, servidor ou banco. | A09–A11 | CA05 |
| T14 | Denial of Service | Envio massivo de arquivos esgota o armazenamento. | A04, A11, A12 | CA05 |
| T15 | Tampering; Denial of Service | Arquivos ou referências são alterados, corrompidos ou excluídos indevidamente. | A04, A05, A10, A12 | CA06 |
| T07 | Repudiation | Um ator nega uma solicitação, concessão, revogação, consulta ou alteração porque o evento não é registrado de forma suficiente. | A03–A05, A08–A10 | CA07 |

As categorias têm cobertura: Spoofing (T01–T02), Tampering (T15), Repudiation (T07), Information Disclosure (T04–T06), Denial of Service (T13–T15) e Elevation of Privilege (T03, T05–T06). T07 foi incluída para completar a categoria anteriormente ausente; a existência de logs imutáveis ou de qualquer implementação permanece **[A confirmar]**.

## Casos de abuso

### CA01 — Cadastro de falso profissional

**Ator:** pessoa mal-intencionada.
**Objetivo:** obter acesso a dados médicos como profissional.
**Condições:** validação de identidade ou habilitação profissional ausente, insuficiente ou burlada. Essa condição é **[A confirmar]** no sistema.
**Fluxo:**

1. O ator registra ou usa dados profissionais falsos.
2. A conta é aceita como profissional.
3. O ator solicita acesso a um paciente.
4. O paciente concede acesso acreditando que o perfil é legítimo.
5. O ator consulta ou altera o que foi autorizado.

**Impacto:** exposição ou alteração de A03–A05 e A12, fraude e perda de confiança.
**STRIDE e ameaças:** Spoofing e Elevation of Privilege; T01 e T03.

### CA02 — Uso de conta ou token de outra pessoa

**Ator:** atacante com credencial ou token de paciente ou profissional.
**Objetivo:** agir em nome da vítima.
**Condições:** obtenção de credencial ou token válido e proteção de sessão insuficiente. Os controles existentes são **[A confirmar]**.
**Fluxo:**

1. O ator obtém a credencial ou token.
2. Inicia ou mantém uma sessão como a vítima.
3. Solicita consulta, alteração ou compartilhamento.
4. O sistema associa a ação à identidade da vítima.

**Impacto:** exposição, alteração ou operações indevidas em A03–A08.
**STRIDE e ameaças:** Spoofing e Elevation of Privilege; T02 e T03.

### CA03 — Reuso de autorização revogada ou expirada

**Ator:** profissional cujo acesso terminou ou atacante com sessão antiga.
**Objetivo:** manter acesso a dados após a decisão do paciente.
**Condições:** estado de autorização não é reavaliado no acesso, ou sessão/token mantém decisão antiga. A implementação é **[A confirmar]**.
**Fluxo:**

1. O profissional recebe uma autorização ativa.
2. O paciente revoga o acesso ou o prazo expira.
3. O ator reutiliza a sessão ou token anterior.
4. A API aceita novo acesso sem verificar o estado atual.

**Impacto:** exposição ou alteração de dados após revogação, comprometendo A03–A10.
**STRIDE e ameaças:** Information Disclosure e Elevation of Privilege; T05.

### CA04 — Consulta ou alteração fora do escopo autorizado

**Ator:** profissional autenticado, paciente ou atacante que manipula requisição.
**Objetivo:** acessar paciente, documento ou operação não incluídos no consentimento.
**Condições:** autorização por recurso/operação incompleta ou confiança em identificadores do cliente. A existência da falha é **[A confirmar]**.
**Fluxo:**

1. O ator usa uma conta ou autorização legítima.
2. Modifica identificador de paciente, documento ou operação.
3. A API compara apenas o perfil geral ou aceita o parâmetro recebido.
4. O recurso fora do escopo é consultado ou alterado.

**Impacto:** violação de confidencialidade e integridade de A03–A05 e A12.
**STRIDE e ameaças:** Information Disclosure e Elevation of Privilege; T03, T04 e T06.

### CA05 — Esgotamento deliberado de capacidade

**Ator:** atacante ou cliente automatizado mal-intencionado.
**Objetivo:** impedir consultas e envios legítimos.
**Condições:** ausência ou insuficiência de limites de requisições, tamanho, quota ou capacidade. A configuração é **[A confirmar]**.
**Fluxo:**

1. O ator envia muitas requisições ou arquivos grandes.
2. API, banco, servidor ou armazenamento consomem capacidade.
3. Solicitações legítimas atrasam ou falham.
4. Pacientes e profissionais ficam sem acesso ao serviço ou aos documentos.

**Impacto:** indisponibilidade de A04 e A09–A12, com prejuízo ao atendimento.
**STRIDE e ameaças:** Denial of Service; T13 e T14.

### CA06 — Alteração, corrupção ou exclusão de documentos

**Ator:** atacante, usuário com permissão indevida ou processo com falha.
**Objetivo:** alterar ou tornar indisponível informação clínica.
**Condições:** autorização de escrita insuficiente, persistência sem proteção ou falha operacional. A causa concreta é **[A confirmar]**.
**Fluxo:**

1. O ator ou processo alcança documento ou referência.
2. Altera, corrompe ou exclui o conteúdo ou vínculo.
3. O registro fica incorreto ou indisponível para o atendimento.

**Impacto:** decisão clínica baseada em dado incorreto, perda de documentos e indisponibilidade de A04, A05, A10 e A12.
**STRIDE e ameaças:** Tampering e Denial of Service; T15.

### CA07 — Negação de ação relevante

**Ator:** paciente, profissional ou atacante com acesso a uma conta.
**Objetivo:** negar uma solicitação, decisão, consulta ou alteração realizada.
**Condições:** registro de auditoria ausente, incompleto, alterável ou sem identidade, tempo e resultado suficientes. O comportamento atual de A08 é **[A confirmar]**.
**Fluxo:**

1. O ator realiza uma ação relevante.
2. O evento não é registrado de modo confiável ou o registro é alterado.
3. O ator nega ter realizado a ação.
4. A equipe não consegue reconstruir o ocorrido.

**Impacto:** responsabilização e investigação prejudicadas, além de perda de confiança em A08.
**STRIDE e ameaças:** Repudiation; T07.

## Rastreabilidade e conclusão

Os detalhes originais de T01–T06 permanecem nos documentos de [identidade e privilégios](ameacas-identidade-autenticacao-privilegios.md) e [consentimento](ameacas-consentimento-acesso-indevido.md). T13–T15 permanecem em [disponibilidade](ameacas-disponibilidade.md). A conversão para risco está em [Etapa 2](etapa2-riscos-e-tratamento.md).

Os ativos mais sensíveis são A03–A05 e A12, pois concentram informação clínica; A08, A09 e A10 sustentam responsabilização e aplicação das regras. As maiores limitações são a ausência de implementação, de testes e de regras decididas para validação profissional, sessão, escopo, limites e auditoria.
