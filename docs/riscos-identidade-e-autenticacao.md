# Riscos de identidade, autenticação e privilégios

Este documento detalha R01–R03 sem substituir o [registro consolidado](etapa2-riscos-e-tratamento.md). A escala usa `probabilidade × impacto`, conforme os [critérios da Etapa 2](etapa2-criterios-e-risco-residual.md).

## Registro

| ID  | Evento de risco                                                       | Origem                |   P |   I | Pontuação | Nível   |
| --- | --------------------------------------------------------------------- | --------------------- | --: | --: | --------: | ------- |
| R01 | Falso profissional obtém acesso autorizado pelo paciente.             | T01, CA01             |   2 |   4 |         8 | Alto    |
| R02 | Conta ou sessão comprometida é usada em nome da vítima.               | T02, CA02             |   3 |   4 |        12 | Crítico |
| R03 | Perfil, paciente, recurso ou operação fora do privilégio é alcançado. | T03, CA01, CA02, CA04 |   3 |   4 |        12 | Crítico |

## Justificativas

### R01 — Falso profissional

**Probabilidade 2:** o abuso exige cadastro fraudulento e falha na validação manual antes de qualquer solicitação de acesso. **Impacto 4:** um paciente pode confiar em identidade falsa e autorizar exposição de dados médicos.

### R02 — Conta ou sessão comprometida

**Probabilidade 3:** phishing, reutilização de senha e roubo de sessão podem ser tentados com recursos comuns. **Impacto 4:** o invasor pode agir em nome da vítima e acessar ou alterar informações conforme o papel comprometido.

### R03 — Acesso fora do privilégio

**Probabilidade 3:** identificadores, recursos e operações podem ser manipulados diretamente na API. **Impacto 4:** uma falha sistêmica de autorização pode expor ou alterar prontuário de outro paciente.

## Tratamento e estado atual

| Risco | Controle definido                                                                                                  | Evidência atual                                                               | Pendência                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| R01   | Cadastro profissional separado da validação manual auditada; conta pendente não solicita acesso.                   | `src/vitallink/professional_validation.py` e testes de cadastro profissional. | Integração automática com conselho de classe e KYC permanecem fora do escopo da primeira versão. |
| R02   | Argon2, TOTP obrigatório, sessão opaca persistida, CSRF, recuperação reforçada, limites e encerramento de sessões. | Rotas de conta/sessão e testes de cadastro, login, recuperação e rate limit.  | Alertas de dispositivo/localização e detecção D04 não estão implementados.                       |
| R03   | Autorização decidida pela API usando papel, paciente, recurso, categoria, operação, período e estado.              | `active_authorization()` e testes negativos de IDOR, escopo e revogação.      | Implementado e testado na API.                                                                  |

Não há JWT como autoridade de sessão nem RBAC/ABAC genérico substituindo o modelo de autorização do VitaLink. A sessão é opaca e a autorização clínica é reavaliada no PostgreSQL para cada operação protegida.

## Risco residual

A estimativa consolidada reduz R01–R03 para **Médio (1 × 4)** quando todas as condições de aceite estiverem comprovadas. O impacto permanece 4 pela sensibilidade dos dados médicos. O residual continua sendo uma estimativa documental, não uma medição operacional.
