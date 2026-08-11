# Ameaças de privacidade e exposição de dados

Este documento registra as ameaças relacionadas ao vazamento, compartilhamento indevido e consulta excessiva de informações médicas no VitaLink.

## Privacidade e confidencialidade

A proteção da privacidade exige que dados sensíveis não sejam expostos além do necessário e que o acesso seja restrito àqueles explicitamente autorizados.

As premissas usadas nesta análise são:
- links de compartilhamento devem ter acesso restrito e controlado;
- APIs devem implementar limite de taxa e proteção contra varreduras massivas;
- o compartilhamento de informações deve manter a rastreabilidade por meio de logs de auditoria detalhados e imutáveis.

## Ameaças identificadas

| ID | Categoria STRIDE | Componente ou ativo | Ameaça concreta | Permissão violada e impacto |
| --- | --- | --- | --- | --- |
| T10 | Information Disclosure | API, armazenamento de documentos e A03, A04, A05, A12 | Um documento acessível por link indevido é visualizado por terceiro não autorizado. | Viola a confidencialidade dos dados do paciente e expõe histórico, exames, receitas, laudos e imagens. Causa perda direta de privacidade e danos à reputação. |
| T11 | Information Disclosure e Repudiation | API, banco de dados, A03, A09 e A10 | Um atacante realiza extração em massa pela API de dados de múltiplos pacientes explorando falta de controle de taxa. | Viola o acesso restrito e extrai grandes volumes de dados. Compromete confidencialidade sistêmica, afeta A10 e causa impactos regulatórios severos. |
| T12 | Repudiation e Information Disclosure | API, banco de dados, registros de auditoria (A08) | Um compartilhamento de dados ocorre sem rastreabilidade devido à ausência ou modificação de logs de auditoria detalhados. | Viola a integridade da auditoria. Impede a responsabilização sobre acessos e compartilhamentos, resultando em exposições não detectáveis de A03 a A05. |

## Análise por ameaça

### T10 — Documento acessível por link indevido

**Ator:** terceiro não autorizado que intercepta ou adivinha um link público, ou atacante explorando falta de autenticação no arquivo.

**Objetivo:** acessar informações médicas confidenciais de um paciente através do link sem possuir autorização.

**Sequência possível:**
1. O sistema gera um link de compartilhamento de um documento sem prazo de validade estrito ou sem proteção por senha.
2. O link é divulgado, interceptado ou adivinhado (se possuir um identificador enumerável).
3. O ator acessa o link.
4. A API ou o armazenamento entrega o arquivo sem confirmar a autorização do leitor.

**Condição ou vulnerabilidade:** ausência de controle de acesso adequado no link compartilhado, uso de identificadores previsíveis, ou inexistência de proteção adicional e prazo de expiração. A implementação dessas proteções fica [A confirmar].

**Caso de abuso relacionado:** CA07 — Compartilhamento público de documento médico, situação a ser detalhada na Issue #14.

### T11 — Extração em massa pela API

**Ator:** atacante externo ou profissional mal-intencionado utilizando ferramentas e scripts automatizados.

**Objetivo:** coletar o máximo de informações médicas e dados pessoais do banco de dados explorando falhas de acesso na API.

**Sequência possível:**
1. O ator mapeia a estrutura dos identificadores da API (ex: requisições por ID sequencial).
2. O ator configura um script automatizado de requisições.
3. A API responde rapidamente a milhares de consultas sem impor limite de taxa (rate limiting).
4. O ator consolida e exfiltra os dados coletados de múltiplos pacientes.

**Condição ou vulnerabilidade:** ausência de limitação de requisições (rate limit) por IP ou sessão, falha de autorização (IDOR - Insecure Direct Object References) permitindo leitura fora do escopo, ou falta de alertas de uso anômalo. A configuração dessas proteções permanece [A confirmar].

**Caso de abuso relacionado:** CA08 — Extração em massa de informações, situação a ser detalhada na Issue #14.

### T12 — Compartilhamento sem rastreabilidade

**Ator:** profissional ou atacante que realiza acesso e compartilhamento de dados sensíveis buscando ocultar suas ações da auditoria do sistema.

**Objetivo:** visualizar ou compartilhar dados sem deixar um rastro auditável confiável que o identifique.

**Sequência possível:**
1. O ator acessa ou compartilha dados sensíveis utilizando o sistema.
2. O sistema não registra o evento adequadamente no log, ou o ator apaga/modifica o registro existente.
3. O evento de compartilhamento ocorre e dados são expostos.
4. Ocorre uma investigação sobre o vazamento, mas os logs insuficientes impedem a identificação de quem realizou a ação.

**Condição ou vulnerabilidade:** registro de logs incompleto ou inexistente para eventos críticos de acesso, logs mutáveis que não protegem contra adulteração, ou banco de dados de auditoria não isolado. A proteção e o escopo dos registros ficam [A confirmar].

**Caso de abuso relacionado:** previsto para ser detalhado futuramente (podendo estar relacionado ao CA06 sobre exclusão de registro).

## Permissões explicitamente violadas

- Compartilhamento indevido ou interceptação de link viola o consentimento e a confidencialidade do histórico médico.
- Extração em massa viola a regra de acesso restrito apenas aos pacientes autorizados pelo escopo de atendimento e viola a disponibilidade justa dos recursos da API.
- Remoção ou ausência de trilha de auditoria viola a regra de transparência e responsabilização exigida para acesso a dados sensíveis de saúde.

## Rastreabilidade

| Ameaça | Caso de abuso | Ativos principais | Risco a registrar posteriormente |
| --- | --- | --- | --- |
| T10 | CA07 | A03, A04, A05, A09, A12 | R10 [A confirmar] — documento é exposto por link. |
| T11 | CA08 | A03, A09, A10 | R11 [A confirmar] — dados são extraídos em massa. |
| T12 | CA06 (parcial) | A08, A09 | R12 [A confirmar] — informação sensível aparece em logs / não rastreabilidade. |

Os casos de abuso CA07 e CA08 serão detalhados na Issue #14, e os riscos R10, R11 e R12 serão avaliados na Issue #19.
