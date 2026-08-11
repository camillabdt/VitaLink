# Etapa 2 — Registro, priorização e tratamento de riscos

## Status e método

Este documento completa o método de [critérios e risco residual](etapa2-criterios-e-risco-residual.md). Os valores são estimativas de planejamento baseadas nas ameaças da [Etapa 1](etapa1-modelagem-de-ameacas.md), não resultados de testes. Controle **proposto** não é controle implementado; o risco residual é esperado e só pode ser confirmado com implementação e evidência.

Usa-se `pontuação = probabilidade × impacto` e as faixas já definidas: 1–3 baixo, 4–7 médio, 8–11 alto e 12–16 crítico.

## Registro, cálculo e justificativas

| Prioridade | ID | Origem | Evento de risco | Condição ou vulnerabilidade | P | I | Pontuação | Nível |
| ---: | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| 1 | R04 | T04 | Dados médicos são acessados sem autorização ativa. | Autorização por recurso/operação ausente ou incompleta. | 3 | 4 | 12 | Crítico |
| 2 | R05 | T05 | Acesso continua após revogação ou expiração. | Estado desatualizado de autorização, sessão ou token. | 3 | 4 | 12 | Crítico |
| 3 | R06 | T06 | Autorização limitada é ampliada. | Confiança em identificador/escopo enviado pelo cliente. | 3 | 4 | 12 | Crítico |
| 4 | R03 | T03 | Perfil, paciente ou operação fora do privilégio é alcançado. | Confiança no perfil ou identificador informado pelo cliente. | 3 | 4 | 12 | Crítico |
| 5 | R02 | T02 | Conta ou token comprometido é usado em nome da vítima. | Credencial ou sessão comprometida; proteções concretas **[A confirmar]**. | 3 | 4 | 12 | Crítico |
| 6 | R01 | T01 | Falso profissional obtém acesso autorizado pelo paciente. | Validação de identidade/habilitação **[A confirmar]**. | 2 | 4 | 8 | Alto |
| 7 | R09 | T15 | Documento ou referência clínica é alterado, corrompido ou apagado. | Escrita indevida, falha de persistência ou recuperação insuficiente **[A confirmar]**. | 2 | 4 | 8 | Alto |
| 8 | R07 | T13 | Sobrecarga torna a API ou banco indisponível. | Limites e capacidade **[A confirmar]**. | 3 | 3 | 9 | Alto |
| 9 | R08 | T14 | Envio massivo esgota armazenamento. | Quota, limite de tamanho e validação de upload **[A confirmar]**. | 2 | 3 | 6 | Médio |
| 10 | R10 | T07 | Ação relevante não pode ser atribuída ou é negada. | Auditoria insuficiente ou alterável **[A confirmar]**. | 2 | 3 | 6 | Médio |

P=3 é plausível porque requisições e credenciais podem ser manipuladas por atores externos ou autenticados. P=2 depende de condição específica ainda não confirmada. I=4 foi usado quando dados médicos ou autorização podem afetar confidencialidade e integridade em larga escala. I=3 representa indisponibilidade ou perda significativa, mas com recuperação potencial. Esses argumentos são inferências documentais, não medição do sistema.

R04–R06 e R03 precedem R02 porque a autorização por recurso e a reavaliação de revogação são a barreira comum ao acesso médico. R02 vem depois por também atingir vários fluxos. R01 e R09 têm impacto clínico alto, mas dependem de decisões ou controles ainda não definidos. R07 e R08 vêm após proteção de acesso; R10 sustenta investigação e deve acompanhar as ações críticas desde o início.

## Mapeamento NIST CSF 2.0

| Risco | Govern | Identify | Protect | Detect | Respond | Recover |
| --- | --- | --- | --- | --- | --- | --- |
| R01 | X | X | X | X | X | — |
| R02 | X | X | X | X | X | X |
| R03 | X | X | X | X | X | — |
| R04 | X | X | X | X | X | — |
| R05 | X | X | X | X | X | — |
| R06 | X | X | X | X | X | — |
| R07 | X | X | X | X | X | X |
| R08 | X | X | X | X | X | X |
| R09 | X | X | X | X | X | X |
| R10 | X | X | X | X | X | — |

As funções organizam resultados. Elas não são controles: por exemplo, Protect em R04 requer a verificação proposta descrita abaixo; não é evidência de que ela exista.

## Plano de tratamento e residual estimado

| Risco | Estratégia | Controles propostos e específicos | Funções | Responsável proposto | Evidência ou verificação necessária | Residual esperado |
| --- | --- | --- | --- | --- | --- | --- |
| R04 | Reduzir | Verificar no servidor paciente, recurso, operação e estado `Ativa` a cada acesso. | Protect, Detect, Respond | Desenvolvimento | Teste negativo de acesso fora do escopo e registro da tentativa. | Médio (2×4) |
| R05 | Reduzir | Reavaliar estado e período no acesso; invalidar decisão de acesso após revogação. | Protect, Detect, Respond | Desenvolvimento | Teste após revogação/expiração e log de bloqueio. | Médio (2×4) |
| R06 | Reduzir | Derivar identidade da sessão e comparar escopo no servidor; não confiar em identificadores do cliente. | Protect, Detect, Respond | Desenvolvimento | Teste de alteração de paciente, documento e operação. | Médio (2×4) |
| R02 | Reduzir | Proteger credenciais e sessão; definir expiração, recuperação e revogação de token. | Protect, Detect, Respond, Recover | Desenvolvimento | Testes de sessão/revogação e registros de uso suspeito. | Alto (2×4) |
| R03 | Reduzir | Aplicar autorização por perfil, recurso e operação no servidor. | Protect, Detect, Respond | Desenvolvimento | Teste negativo de operação de outro perfil. | Médio (2×4) |
| R01 | Reduzir | Definir e aplicar validação de identidade e habilitação antes de liberar perfil profissional. | Govern, Protect, Detect, Respond | Desenvolvimento e Segurança | Critério versionado e teste do fluxo de aprovação/rejeição. | Médio (1×4) |
| R09 | Reduzir | Autorizar escrita, validar vínculo paciente-documento e definir cópia/restauração verificável. | Protect, Detect, Respond, Recover | Desenvolvimento e infraestrutura **[A confirmar]** | Teste de escrita indevida e restauração em ambiente controlado. | Médio (1×4) |
| R07 | Reduzir | Limitar requisições nos pontos expostos e definir capacidade/degradação aceitável. | Protect, Detect, Respond, Recover | Infraestrutura **[A confirmar]** | Teste de carga controlado e métricas de disponibilidade. | Médio (2×3) |
| R08 | Reduzir | Limitar tamanho/tipo de arquivo e quota por política definida. | Protect, Detect, Respond, Recover | Desenvolvimento e infraestrutura **[A confirmar]** | Teste de upload acima do limite e alerta de capacidade. | Baixo (1×3) |
| R10 | Reduzir | Registrar identidade, ação, alvo, resultado e tempo; restringir alteração dos registros. | Govern, Protect, Detect, Respond | Desenvolvimento **[A confirmar]** | Teste que gera evento e revisão de integridade do registro. | Baixo (1×3) |

Nenhum residual é aceito no estado atual. Aceite futuro exige responsável nomeado, implementação do controle, teste bem-sucedido e evidência versionada. A redução real de risco é **[A confirmar]**.

## Ordem inicial de implementação

1. Definir modelo de autorização e implementar verificação de servidor para R04–R06.
2. Implementar revogação/expiração efetiva e testes para R05.
3. Definir autenticação, sessão e validação profissional para R02 e R01.
4. Implementar auditoria de ações críticas para R10.
5. Proteger escrita, recuperação e disponibilidade para R09, R07 e R08.

Essa ordem é proposta pois as primeiras barreiras reduzem diversos caminhos de acesso indevido. Ela deve ser revisada quando houver arquitetura, implementação e capacidade real **[A confirmar]**.

## Considerações finais

O maior risco planejado é acesso indevido a dados médicos, seguido por continuidade após revogação e ampliação de escopo. A limitação central é que o repositório não contém aplicação, pipeline, execução de teste ou evidência de controle. Portanto, este plano atende à análise documental, mas não comprova redução de risco.
