# Implementação da issue #62 — mensagens clínicas

## Estado e limite da entrega

Esta fatia permite mensagens textuais entre profissionais com autorização ativa para o mesmo paciente. Não existe diretório global. Mensagens enviadas permanecem imutáveis; uma correção cria outra mensagem ligada à original.

## Jornadas executáveis

1. `GET /api/v1/clinical-message-recipients` deriva a equipe das autorizações `mensagens:consultar` e `mensagens:anexar` vigentes para o paciente.
2. `POST /api/v1/step-up-confirmations` confirma o TOTP para `clinical_message_write`.
3. `POST /api/v1/clinical-messages` reavalia `mensagens:anexar` para remetente e destinatário, valida todas as menções e consome a confirmação.
4. `GET /api/v1/clinical-messages` exige `mensagens:consultar` para ambos, lista apenas a conversa solicitada e atualiza o estado persistido de leitura do destinatário.
5. `POST /api/v1/clinical-messages/{id}/corrections` exige o remetente original, `mensagens:atualizar` para ambos, motivo e novo TOTP. A linha original não é modificada.

Cada envio gera notificação interna para o destinatário. O badge da equipe conta mensagens ainda não lidas. Revogação ou expiração remove imediatamente equipe e conversa, sem apagar o histórico retido.

## Controles verificáveis

- outra categoria nunca lista equipe, lê ou envia mensagens;
- somente profissionais mutuamente elegíveis aparecem na busca e nas sugestões;
- identificadores mencionados fora da equipe são rejeitados sem revelar o diretório;
- destinatário e terceiro não corrigem autoria; uma mensagem aceita no máximo uma correção direta;
- CSRF, TOTP de uso único, limites de texto e identificadores opacos protegem escritas;
- auditoria registra resultado, correlação e contagem de menções sem texto clínico, nomes ou justificativa.

## Interface conectada

`ClinicalMessages` integra busca da equipe, badge, seleção de conversa, resposta, histórico e correção. O componente é reutilizado no detalhe do paciente e na página profissional “Mensagens”, acessível pelo destino `doctor-messages` da sidebar. A página independente lista colegas elegíveis e conversas recentes sem criar diretório global. O componente reutiliza `MentionTextarea`; não há dados simulados, edição em lugar ou exclusão.

## TDD e verificação

O RED inicial registrou a ausência do modelo público. Os ciclos seguintes cobriram troca entre dois profissionais reais, correção ligada, categoria incorreta, menção inelegível, IDOR, autoria, revogação e retenção.

| Suíte | Cobertura desta issue                                                                 |
| ----- | ------------------------------------------------------------------------------------- |
| TS03  | escopo bilateral, outra categoria, IDOR, autoria e revogação imediata;                |
| TS04  | imutabilidade, correção vinculada, menções elegíveis e retenção;                      |
| TS06  | sucessos e negações auditados sem conteúdo clínico;                                   |
| TS08  | carregamento, vazio, busca, badge, conversa, envio, correção, erro e sessão expirada. |

Na entrega original da issue, em 14 de agosto de 2026, a validação executou Ruff, 75 testes backend, consistência Alembic, TypeScript, 48 testes frontend em treze arquivos, formatação e build de produção. A página profissional independente foi acrescentada posteriormente no commit `c686e68`; por isso, os números originais são históricos e não representam o gate do HEAD atual.

A inspeção visual manual não foi repetida porque o mesmo navegador integrado e a mesma configuração TLS da #61 continuariam bloqueados pelo certificado local autoassinado já verificado. Nenhum desvio de validação TLS foi introduzido; a interface foi validada por testes de componente e build.
