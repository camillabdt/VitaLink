# Casos de abuso de privacidade

Este documento detalha os casos de abuso relacionados à privacidade e vazamento de informações no VitaLink, correspondentes à Issue #14. Os cenários complementam as ameaças T10, T11 e T12 da análise STRIDE e descrevem situações possíveis de abuso sem afirmar que essas vulnerabilidades já existem na implementação.

## CA07 — Compartilhamento público de documento médico

**Ator:** usuário mal-intencionado ou terceiro não autorizado que intercepta ou adivinha um link de compartilhamento.

**Objetivo:** acessar informações médicas confidenciais de um paciente através do vazamento ou má configuração de acesso de um link.

**Condições necessárias:**

- uma regressão introduz ou mantém rota pública para exames e laudos, contrariando o escopo da primeira versão;
- o link do documento médico é interceptado, descoberto por padrão previsível (força-bruta) ou exposto acidentalmente;
- a API ou o sistema de armazenamento entrega o documento somente com o conhecimento da URL, sem exigir autenticação do destinatário ou fornecimento de senha adicional.

**Fluxo de abuso:**

1. A aplicação expõe uma URL pública ou permanente para um exame (A04).
2. O paciente envia o link para um familiar ou profissional fora da plataforma através de um canal externo.
3. Um terceiro intercepta a mensagem, encontra o link na internet ou o adivinha por enumeração de identificadores.
4. O terceiro não autorizado acessa o link no navegador.
5. O VitaLink processa a requisição e autoriza o download imediato, pois a API não exige autenticação ou validação extra do destinatário.
6. O atacante visualiza e salva o documento confidencial do paciente.

**Falha de segurança explorada:**
O sistema confia exclusivamente no conhecimento do link para conceder acesso a dados privados. A primeira versão evita esse recurso e exige sessão e autorização reavaliada; a suíte deve comprovar que a regressão descrita não existe.

**Impacto:**
Violação grave de privacidade com a exposição de exames, diagnósticos e históricos médicos sensíveis. Resulta em exposição direta e indevida da intimidade do paciente e potencial quebra da confiança na plataforma médica.

**Ativos envolvidos:**

- A03 — Dados médicos dos pacientes
- A04 — Exames, laudos e imagens médicas
- A05 — Receitas e prescrições médicas
- A09 — API
- A12 — Armazenamento de documentos

**Ameaças relacionadas:**

- T10 — Documento acessível por link indevido: ameaça principal explorada neste caso.

**Categorias STRIDE:**

- Information Disclosure: o atacante visualiza e exfiltra dados sensíveis que deveriam ser estritamente restritos.

---

## CA08 — Extração em massa de informações

**Ator:** atacante externo ou profissional de saúde mal-intencionado utilizando script automatizado e requisições massivas.

**Objetivo:** coletar o histórico médico e os dados pessoais do maior número possível de pacientes do VitaLink de forma rápida para fins maliciosos.

**Condições necessárias:**

- o ator possui uma credencial ou token válido inicial para interagir com a API;
- o sistema não aplica limites efetivos de taxa de requisições (rate limit) por usuário, sessão ou IP;
- a API possui brechas de autorização em seus endpoints de consulta que permitem a travessia por identificadores sequenciais de pacientes (vulnerabilidade IDOR);
- a infraestrutura não detecta, bloqueia ou alerta sobre comportamentos anômalos de leitura intensa.

**Fluxo de abuso:**

1. O atacante autentica-se no sistema com uma conta legítima ou comprometida.
2. O atacante configura e executa um script automatizado para enviar milhares de requisições de leitura à API, variando os identificadores dos prontuários solicitados de maneira sequencial.
3. A API não aplica limite de taxa e responde de imediato a todas as requisições sem interromper ou bloquear a automação.
4. O sistema ignora que as consultas estão fora do escopo de autorização do profissional (devido à falha de validação de recurso - IDOR).
5. O script do atacante consolida um grande banco de dados local com todas as informações obtidas.
6. Os dados extraídos em massa são exfiltrados, concluindo o vazamento sistemático.

**Falha de segurança explorada:**
A aplicação falha duplamente: em garantir que o ator consulte apenas o escopo estrito ao qual tem direito (IDOR) e em impor barreiras contra abusos de grande volume de tráfego de leitura de dados (Rate Limit). As configurações reais do rate limit e do monitoramento da API permanecem [A confirmar].

**Impacto:**
Vazamento em massa da base de dados do sistema, expondo centenas ou milhares de pacientes simultaneamente. Pode resultar em pesadas multas regulatórias e judiciais (LGPD), danos irreparáveis à reputação e exposição massiva de dados pessoais e clínicos.

**Ativos envolvidos:**

- A01 — Dados pessoais dos pacientes
- A03 — Dados médicos dos pacientes
- A08 — Registros de auditoria (caso falhem em registrar o volume anormal ou a própria trilha seja comprometida)
- A09 — API
- A10 — Banco de dados

**Ameaças relacionadas:**

- T11 — Extração em massa pela API: ameaça principal explorada neste caso.

**Categorias STRIDE:**

- Information Disclosure: vazamento generalizado de registros confidenciais da base de dados.
- Repudiation: se a extração em massa não deixar indícios suficientes nos logs da aplicação para identificar claramente a extensão do dano e o ator.

---

## Rastreabilidade

| Caso de abuso                                       | Ameaças relacionadas | Categoria STRIDE principal | Ativos principais       |
| --------------------------------------------------- | -------------------- | -------------------------- | ----------------------- |
| CA07 — Compartilhamento público de documento médico | T10                  | Information Disclosure     | A03, A04, A05, A09, A12 |
| CA08 — Extração em massa de informações             | T11                  | Information Disclosure     | A01, A03, A08, A09, A10 |
