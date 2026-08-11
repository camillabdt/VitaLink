# Etapa 6 — Resposta a incidentes e detecção

## Status

Este roteiro e as regras são **propostos**. Não há mecanismo de logs, monitoramento ou alertas implementado no repositório; as regras não são evidência de detecção ativa.

## Roteiro de resposta a incidentes proposto

1. Receber e registrar o alerta, preservando o horário, o alerta e os identificadores disponíveis.
2. Classificar o possível incidente e o escopo afetado, sem acessar dados além do necessário.
3. Conter o acesso ou serviço afetado, incluindo revogação de autorização/sessão quando aplicável.
4. Preservar registros e investigar ator, recursos, ações e impacto.
5. Corrigir a condição identificada, validar a correção e comunicar paciente e profissional afetados quando aplicável, conforme decisão da equipe de Segurança.
6. Recuperar dados ou serviço quando necessário e registrar lições e ações pendentes.

Segurança coordena e recebe os alertas; Desenvolvimento corrige controles; Infraestrutura contém indisponibilidade e recupera serviço, conforme DS09.

## Regras de detecção propostas

| ID | Evento observado | Condição de acionamento | Destino ou responsável | Ação esperada | Risco |
| --- | --- | --- | --- | --- | --- |
| D01 | Tentativa de consulta/alteração de dado médico. | Cinco negações de autorização para a mesma conta em 10 minutos. | Segurança | Bloquear, registrar e investigar repetição ou impacto. | R04–R06 |
| D02 | Uso de sessão após alteração de autorização. | Qualquer acesso negado após revogação ou expiração para o mesmo paciente-profissional. | Segurança | Bloquear e investigar. | R05 |
| D03 | Envio de documento ou requisição à API. | Mais de 20 requisições por minuto ou arquivo acima de 20 MB. | Infraestrutura | Limitar a operação, registrar e verificar disponibilidade. | R07–R08 |

Os limiares são decisões iniciais de DS10 e devem ser reavaliados com métricas reais. Eventos seguem DS08; a retenção de logs será definida antes da implantação.
