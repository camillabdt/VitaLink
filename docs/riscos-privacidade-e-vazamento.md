# Riscos de privacidade e vazamento

Esta documentação registra os riscos R10, R11 e R12, com foco na análise de proteção da privacidade e a prevenção contra vazamentos de dados médicos no sistema VitaLink.

A metodologia de priorização adotada cruza métricas de probabilidade (escala 1-4) com impacto potencial (escala 1-4), estabelecendo a criticidade pela multiplicação de ambos os fatores.

As matrizes de origem derivam diretamente das ameaças T10, T11 e T12 mapeadas anteriormente (Issue #9).

## Registro de riscos

| ID | Risco | Ameaça | Probabilidade | Impacto | Pontuação | Nível |
| --- | --- | --- | --- | --- | --- | --- |
| R10 | Documento é exposto por link | T10 | 3 | 4 | 12 | Crítico |
| R11 | Dados são extraídos em massa | T11 | 2 | 4 | 8 | Alto |
| R12 | Compartilhamento ou consulta sensível não possui rastreabilidade suficiente | T12 | 3 | 3 | 9 | Alto |

## R10 — Documento é exposto por link

**Ameaça relacionada:** T10 — Documento acessível por link indevido.

**Caso de abuso relacionado:** CA07 — Compartilhamento público de documento médico.

**Ativos principais:** A03, A04, A05, A09 e A12.

**Probabilidade — 3 (Média-alta)**
A geração de links para compartilhamento de exames é uma funcionalidade ativa e comum. Sem controles de tempo de expiração curtos, senhas ou identificadores imprevisíveis, o vazamento ou adivinhação do link torna o acesso indevido altamente provável ao longo do tempo.

A exploração depende principalmente de erros humanos ao compartilhar o link ou de identificadores fracos. Por isso, a ocorrência é considerada plausível em um sistema sem defesas adicionais no compartilhamento de anexos.

**Impacto — 4 (Muito alto)**
Uma exploração bem-sucedida expõe diretamente diagnósticos e arquivos médicos detalhados do paciente.

Além da grave quebra de confidencialidade da intimidade do usuário, o incidente viola as regras de acesso restrito de saúde e pode gerar processos judiciais ou sanções.

**Pontuação**
3 × 4 = 12 — Crítico

**Estratégia de tratamento**
Reduzir. O recurso de compartilhamento facilita a colaboração e não pode ser removido. Portanto, o sistema deve incorporar controles (como senhas e validade) que limitem drasticamente a janela e a facilidade de exploração, reduzindo a probabilidade.

## R11 — Dados são extraídos em massa

**Ameaça relacionada:** T11 — Extração em massa pela API.

**Caso de abuso relacionado:** CA08 — Extração em massa de informações.

**Ativos principais:** A01, A03, A08, A09 e A10.

**Probabilidade — 2 (Média-baixa)**
A execução de um ataque de extração massiva depende de conhecimentos de automação (uso de scripts/bots) e da exploração de falhas como IDOR combinadas com a ausência de *rate limiting*.

A exploração exige condições e ferramentas específicas, e um ataque volumoso pode apresentar falhas ou interrupções naturais de rede. Por isso, sua probabilidade inicial é classificada como média-baixa.

**Impacto — 4 (Muito alto)**
O ataque compromete todo ou grande parte do banco de dados, vazando simultaneamente o histórico de centenas ou milhares de pacientes.

O vazamento em massa gera crise reputacional grave para o sistema e resulta em pesadas penalidades regulatórias e legais (como as previstas na LGPD).

**Pontuação**
2 × 4 = 8 — Alto

**Estratégia de tratamento**
Reduzir. As APIs devem necessariamente estar disponíveis para receber consultas de profissionais e pacientes. A mitigação ocorre reduzindo a probabilidade e velocidade de um ataque através de limites estruturais e monitoramento ativo.

## R12 — Compartilhamento ou consulta sensível sem rastreabilidade suficiente

**Ameaça relacionada:** T12 — Compartilhamento sem rastreabilidade.

**Casos de abuso relacionados:** CA07 — Compartilhamento público de documento médico; CA08 — Extração em massa de informações.

**Ativos principais:** A03, A04, A05, A08, A09 e A10.

**Probabilidade — 3 (Média-alta)**
Consultas e compartilhamentos são operações recorrentes no VitaLink. Na ausência de requisitos explícitos de auditoria, esses eventos podem ocorrer sem registrar de forma suficiente quem realizou a ação, qual recurso foi acessado ou compartilhado, quando ocorreu e qual foi o resultado.

A ausência, incompletude ou possibilidade de alteração dos registros de auditoria torna plausível que uma exposição de dados não possa ser reconstruída posteriormente.

**Impacto — 3 (Alto)**
A falta de rastreabilidade prejudica a investigação de incidentes, a responsabilização por acessos e compartilhamentos e a identificação do alcance de uma eventual exposição de informações médicas.

Além disso, registros de auditoria mal projetados podem criar um problema complementar: o próprio log pode armazenar tokens, parâmetros ou conteúdo médico desnecessário. Essa condição deve ser evitada por sanitização, mas não altera o significado de R12.

**Pontuação**
3 × 3 = 9 — Alto

**Estratégia de tratamento**
Reduzir. O VitaLink precisa manter uma trilha de auditoria íntegra para consultas, compartilhamentos e demais operações sensíveis, registrando somente os dados necessários para investigação e responsabilização.

Os registros devem identificar ator, recurso, operação, resultado e horário, protegendo a trilha contra alteração indevida e evitando o armazenamento de senhas, tokens completos ou conteúdo integral de documentos médicos.

## Plano de tratamento

| Risco | Controle proposto | Função NIST CSF 2.0 | Responsável | Evidência esperada |
| --- | --- | --- | --- | --- |
| R10 | Gerar rotas de anexos usando identificadores únicos e imprevisíveis (UUIDv4) | Protect | Desenvolvimento API | Testes de penetração atestando impossibilidade de força-bruta |
| R10 | Implementar tempo de expiração e proteção por senha | Protect | Arquitetura | Falha intencional retornada ao acessar um link expirado |
| R11 | Configurar políticas de *Rate Limiting* nas consultas à API | Protect | Infraestrutura | Relatórios de bloqueio (*HTTP 429*) em testes de carga |
| R11 | Desenvolver alertas para tráfego anômalo e leitura fora do padrão | Detect | Segurança / Monitoramento | Alertas gerados após requisições massivas seguidas |
| R11 | Validar a autorização de cada ID solicitado (IDOR) | Protect | Desenvolvimento API | Testes confirmando acesso negado ao tentar manipular o *ID* de pacientes |
| R12 | Sanitizar os registros de auditoria para evitar segredos ou conteúdo médico desnecessário | Protect | Desenvolvimento Backend | Logs sem senhas, *tokens* completos ou conteúdo integral de documentos médicos |
| R12 | Garantir trilha íntegra em consultas e compartilhamentos | Detect | Administração de Banco de Dados | Registros contendo ator, recurso, operação, resultado e horário |

## Relação complementar com o Framework NIST CSF 2.0

Além das funções relacionadas aos controles, as medidas adotadas para tratar esses riscos de privacidade envolvem:

- **Govern:** definição de políticas sobre retenção de links, limites de uso da API e regras de privacidade e mascaramento;
- **Identify:** mapeamento dos ativos expostos por link e processos de log;
- **Protect:** aplicação técnica de limites de taxa, validação de autorização e ofuscação;
- **Detect:** monitoramento de alertas de extração e revisão de trilhas;
- **Respond:** revogação de acessos, derrubada emergencial de links ou bloqueio de IPs atacantes.
- **Recover:** recuperar a integridade dos serviços e notificar autoridades e envolvidos conforme legislações de proteção de dados.

## Estimativa de risco residual

A projeção abaixo indica o patamar de segurança esperado ao implementar os controles sugeridos corretamente.

| Risco | Nível inicial | Probabilidade residual | Impacto residual | Pontuação residual | Nível residual |
| --- | --- | --- | --- | --- | --- |
| R10 | Crítico (12) | 1 | 4 | 4 | Médio |
| R11 | Alto (8) | 1 | 4 | 4 | Médio |
| R12 | Alto (9) | 1 | 3 | 3 | Baixo |

*Nota sobre a redução:* O impacto financeiro, moral ou legal (pontuação de impacto) não diminui, pois o valor do dado médico vazado continua altíssimo em qualquer cenário. O que despenca para níveis aceitáveis é a probabilidade (reduzida para 1) de o atacante conseguir concluir a extração ou obter o arquivo sem a devida autorização técnica.

## Condições para aceite do risco residual

O nível residual deve ser considerado aceitável quando existirem as seguintes evidências:

- links compartilhados expiram corretamente e requerem validação adicional;
- a API bloqueia ativa e imediatamente picos anômalos de requisição;
- não há forma de manipular IDs para varrer prontuários sem autorização (prevenção IDOR);
- os logs gerados mascaram campos críticos sem intervenção manual;
- os testes de vulnerabilidades confirmem a proteção efetiva.

Caso essas defesas reprovem nos testes de aceitação, o sistema continuará tecnicamente submetido à pontuação inicial crítica.

## Dependência documental

Este artefato deriva e complementa diretamente a análise das ameaças T10, T11 e T12 consolidadas na **Issue #9** e com os cenários de caso de abuso CA07 e CA08 formalizados na **Issue #14**.
