# Etapa 2 — Registro, priorização e tratamento de riscos

## Método e status

Esta análise usa `pontuação = probabilidade × impacto`, com as faixas definidas em [critérios](etapa2-criterios-e-risco-residual.md): 1–3 baixo, 4–7 médio, 8–11 alto e 12–16 crítico. Os valores e os riscos residuais são estimativas documentais. Um controle proposto não é controle implementado.

## Registro consolidado

| Prioridade | ID | Origem | Evento de risco | Vulnerabilidade ou condição | P | I | Pontuação | Nível |
| ---: | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| 1 | R04 | T04 | Dados médicos são acessados sem autorização ativa. | A API não valida paciente, recurso e operação em cada consulta. | 3 | 4 | 12 | Crítico |
| 2 | R05 | T05 | Acesso continua após revogação ou expiração. | Uma decisão anterior é reutilizada sem consultar o estado atual. | 3 | 4 | 12 | Crítico |
| 3 | R06 | T06 | Autorização limitada é ampliada. | Escopo, período ou operação não são aplicados no servidor. | 3 | 4 | 12 | Crítico |
| 4 | R03 | T03 | Perfil, paciente, recurso ou operação fora do privilégio é alcançado. | O servidor confia em perfil ou identificador informado pelo cliente. | 3 | 4 | 12 | Crítico |
| 5 | R02 | T02 | Conta ou sessão comprometida é usada em nome da vítima. | Recuperação, credenciais ou ciclo de vida da sessão são insuficientes. | 3 | 4 | 12 | Crítico |
| 6 | R10 | T10 | Documento médico é exposto por link indevido. | Link previsível, direto, não revogável ou sem expiração. | 3 | 4 | 12 | Crítico |
| 7 | R01 | T01 | Falso profissional obtém acesso autorizado pelo paciente. | Conta profissional pode solicitar acesso sem validação suficiente. | 2 | 4 | 8 | Alto |
| 8 | R07 | T07 | Informação clínica é criada ou alterada indevidamente. | Escrita não é autorizada por ator, recurso e operação. | 2 | 4 | 8 | Alto |
| 9 | R08 | T08 | Registro clínico é excluído ou ocultado. | Exclusão sem autorização, versionamento ou recuperação verificável. | 2 | 4 | 8 | Alto |
| 10 | R11 | T11 | Dados de múltiplos pacientes são extraídos pela API. | Consultas sem limite e autorização insuficiente por recurso. | 2 | 4 | 8 | Alto |
| 11 | R15 | T15 | Arquivo ou referência clínica é corrompido ou perdido. | Integridade, versionamento ou restauração não são verificados. | 2 | 4 | 8 | Alto |
| 12 | R13 | T13 | Sobrecarga indisponibiliza API ou banco. | Requisições não são limitadas por ator ou origem. | 3 | 3 | 9 | Alto |
| 13 | R12 | T12 | Compartilhamento não possui rastreabilidade suficiente. | Eventos críticos são ausentes, incompletos ou alteráveis. | 3 | 3 | 9 | Alto |
| 14 | R09 | T09 | Ação relevante não pode ser atribuída ao autor. | Auditoria não registra ou não protege os dados necessários. | 2 | 3 | 6 | Médio |
| 15 | R14 | T14 | Upload massivo esgota o armazenamento. | Tamanho, tipo ou quota de upload não são limitados. | 2 | 3 | 6 | Médio |

## Justificativas

| Risco | Justificativa de probabilidade e impacto |
| --- | --- |
| R01 | P=2 porque depende de identidade fraudulenta e validação insuficiente. I=4 porque pacientes podem conceder a um impostor acesso a dados e documentos médicos. |
| R02 | P=3 porque credenciais e sessões podem ser capturadas com recursos comuns se o ciclo de autenticação falhar. I=4 porque a conta permite consultar dados e agir como a vítima. |
| R03 | P=3 porque a manipulação de identificadores é simples quando a API não autoriza cada objeto. I=4 porque dados de outro paciente podem ser expostos ou alterados. |
| R04 | P=3 porque uma rota que verifica apenas autenticação é diretamente testável. I=4 porque pacientes, prontuários e documentos perdem confidencialidade. |
| R05 | P=3 porque uma sessão ainda autenticada pode ser reutilizada após a decisão do paciente. I=4 porque o acesso contraria o consentimento e expõe informação clínica. |
| R06 | P=3 porque parâmetros de escopo e operação podem ser alterados pelo cliente. I=4 porque a ampliação pode permitir leitura ou escrita não autorizada. |
| R07 | P=2 porque requer uma rota de escrita com autorização incompleta. I=4 porque informação clínica incorreta pode afetar pacientes, profissionais e decisões de atendimento. |
| R08 | P=2 porque requer capacidade de exclusão ou manipulação de referência. I=4 porque o histórico pode ser ocultado ou perdido e a recuperação pode não ser possível. |
| R09 | P=2 porque depende de auditoria ausente ou vulnerável. I=3 porque dificulta investigação e responsabilização, embora não altere necessariamente o dado clínico. |
| R10 | P=3 porque links podem ser encaminhados ou descobertos se não forem imprevisíveis e temporários. I=4 porque documentos médicos podem ser expostos a terceiros. |
| R11 | P=2 porque exige automação e uma falha de autorização ou limite. I=4 porque pacientes e dados em grande volume podem ser afetados. |
| R12 | P=3 porque consultas e compartilhamentos são operações recorrentes. I=3 porque logs insuficientes prejudicam detecção, resposta e delimitação da exposição. |
| R13 | P=3 porque alto volume pode ser gerado com ferramentas comuns. I=3 porque pacientes e profissionais podem perder acesso durante atendimento, com recuperação possível. |
| R14 | P=2 porque exige rota de upload e volume acumulado. I=3 porque impede novos documentos e degrada o serviço, mas a capacidade pode ser restaurada. |
| R15 | P=2 porque depende de falha de persistência, autorização ou restauração. I=4 porque exames, laudos e prescrições podem ser perdidos ou ficar incorretos. |

Os níveis resultam diretamente das pontuações e refletem a sensibilidade dos dados médicos, o controle do paciente e a necessidade de disponibilidade. Os ativos e componentes citados estão detalhados na [Etapa 1](etapa1-modelagem-de-ameacas.md).

## Plano de tratamento e risco residual estimado

Todos os riscos usam a estratégia **Reduzir**, pois as funções que lhes dão origem fazem parte do escopo do VitaLink e controles verificáveis podem diminuir a probabilidade. A escolha não representa redução já alcançada.

| Risco | Controles propostos | NIST CSF 2.0 | Responsável proposto | Evidência e verificação | Residual esperado | Condição para aceite |
| --- | --- | --- | --- | --- | --- | --- |
| R01 | Validar identidade e registro profissional antes de habilitar solicitações. | Govern, Identify, Protect | Desenvolvimento e Segurança | Testes dos estados de validação e revisão do cadastro. | Médio (1×4) | Fluxos inválidos são negados e as evidências são versionadas. |
| R02 | Proteger recuperação e sessão; permitir revogação das sessões anteriores. | Protect, Detect, Respond, Recover | Desenvolvimento e Segurança | Testes de recuperação, expiração e revogação. | Médio (1×4) | Sessões inválidas são negadas e eventos são registrados. |
| R03 | Autorizar no servidor por ator, paciente, recurso e operação. | Identify, Protect, Detect | Desenvolvimento | Testes negativos de acesso cruzado. | Alto (2×4) | Todos os endpoints protegidos negam referências fora do privilégio. |
| R04 | Negar por padrão e exigir autorização ativa em cada consulta. | Protect, Detect | Desenvolvimento | Testes de consulta sem autorização. | Alto (2×4) | Consultas sem autorização são negadas e auditadas. |
| R05 | Reavaliar estado e expiração em cada nova operação. | Protect, Detect, Respond | Desenvolvimento | Testes após revogação e expiração. | Alto (2×4) | Nenhum novo acesso ocorre depois da revogação ou expiração. |
| R06 | Aplicar escopo, período e operação no servidor. | Protect, Detect | Desenvolvimento | Testes de ampliação de escopo e operação. | Alto (2×4) | Operações fora do escopo são negadas e auditadas. |
| R07 | Autorizar escrita, validar entrada e preservar versão anterior. | Protect, Detect, Recover | Desenvolvimento | Testes de escrita indevida e restauração. | Médio (1×4) | Escritas indevidas são negadas e versões autorizadas são recuperáveis. |
| R08 | Autorizar exclusão e manter exclusão lógica ou versão recuperável. | Protect, Detect, Respond, Recover | Desenvolvimento e Infraestrutura | Testes de exclusão e restauração. | Médio (1×4) | Exclusões indevidas são negadas e a recuperação é comprovada. |
| R09 | Registrar ator, alvo, operação, resultado e horário; proteger a trilha. | Govern, Protect, Detect, Respond | Desenvolvimento | Testes de completude e integridade do evento. | Baixo (1×3) | Eventos críticos completos e protegidos são reproduzíveis. |
| R10 | Mediar links pela API com identificador imprevisível, expiração e revogação. | Protect, Detect, Respond | Desenvolvimento | Testes de link inválido, expirado e revogado. | Médio (1×4) | O documento não é entregue fora do estado e período válidos. |
| R11 | Autorizar cada recurso, limitar volume e alertar comportamento anômalo. | Protect, Detect, Respond | Desenvolvimento e Infraestrutura | Testes de acesso cruzado, limite e alerta. | Médio (1×4) | Varreduras são negadas ou limitadas e geram evidência. |
| R12 | Auditar consultas e compartilhamentos sem registrar segredos ou conteúdo desnecessário. | Govern, Protect, Detect, Respond | Desenvolvimento | Testes de completude e sanitização. | Baixo (1×3) | Eventos permitem reconstrução sem expor dados desnecessários. |
| R13 | Limitar requisições e monitorar capacidade e disponibilidade. | Protect, Detect, Respond, Recover | Infraestrutura | Teste de carga controlado, alerta e recuperação. | Médio (2×3) | O limite protege uso legítimo e a recuperação é demonstrada. |
| R14 | Limitar tamanho, tipo e quota; monitorar capacidade. | Protect, Detect, Respond, Recover | Desenvolvimento e Infraestrutura | Testes de upload bloqueado e métrica de capacidade. | Médio (2×3) | Arquivos fora dos limites são rejeitados antes do armazenamento. |
| R15 | Verificar integridade, preservar versões e testar restauração. | Protect, Detect, Respond, Recover | Desenvolvimento e Infraestrutura | Teste de corrupção, exclusão e restauração. | Médio (1×4) | A integridade é verificada e a restauração é reproduzível. |

Nenhum residual está aceito no estado atual. Cada aceite futuro exige responsável nomeado, controle implementado, teste bem-sucedido e evidência versionada.

## Priorização e ordem inicial de implementação

1. Implementar autorização por recurso, operação, escopo e período, incluindo revogação imediata (R03–R06). Esses riscos críticos afetam diretamente dados médicos e o controle do paciente; o mesmo mecanismo reduz vários caminhos de abuso.
2. Proteger identidade, sessão e validação profissional (R02 e R01). Esses controles são pré-requisitos para confiar no ator usado pela autorização.
3. Proteger compartilhamento e extração (R10–R12). R10 é crítico; R11 e R12 podem ampliar o número de pacientes afetados e a dificuldade de resposta.
4. Proteger escrita, exclusão, integridade e recuperação (R07, R08 e R15). O impacto clínico é alto, mas os cenários dependem de capacidades específicas de escrita ou armazenamento.
5. Implementar auditoria de ações críticas (R09). O controle apoia detecção e resposta dos grupos anteriores.
6. Limitar requisições, uploads e capacidade (R13 e R14). Os riscos afetam disponibilidade e permanecem importantes, mas a recuperação é mais plausível do que em uma exposição ou alteração de dado clínico.

A prioridade não segue apenas a pontuação: considera sensibilidade dos ativos, alcance, possibilidade de recuperação e dependências entre controles.

## Considerações finais

R03–R06, R02 e R10 são os riscos mais importantes por combinarem nível crítico com perda de confidencialidade ou de controle do paciente. A estratégia predominante é Reduzir. Protect e Detect aparecem com maior frequência, apoiadas por Govern, Identify, Respond e Recover conforme o cenário. Os controles essenciais são autorização contextual, ciclo seguro de sessão, validação profissional, auditoria sanitizada, compartilhamento temporário, limites de uso e recuperação verificável.

A principal dificuldade documental foi consolidar contribuições distribuídas sem perder a relação T01–T15 → R01–R15 e sem tratar propostas como implementação. A avaliação permanece limitada pela ausência de aplicação e testes do VitaLink. As próximas etapas precisam definir tecnologia, responsáveis nominais, valores de limites, implementar os controles e confirmar os residuais com evidências executáveis.
