# Etapa 2 — Registro, priorização e tratamento de riscos

## Método e status

Esta análise usa `pontuação = probabilidade × impacto`, com as faixas definidas em [critérios](etapa2-criterios-e-risco-residual.md): 1–3 baixo, 4–7 médio, 8–11 alto e 12–16 crítico. Os valores são estimativas documentais. Um controle proposto não é controle implementado, e o residual só pode ser confirmado por evidência executável.

## Registro consolidado

| Prioridade | ID  | Origem | Evento de risco                                                       |   P |   I | Pontuação | Nível   |
| ---------: | --- | ------ | --------------------------------------------------------------------- | --: | --: | --------: | ------- |
|          1 | R04 | T04    | Dados médicos são acessados sem autorização ativa.                    |   3 |   4 |        12 | Crítico |
|          2 | R05 | T05    | Acesso continua após revogação ou expiração.                          |   3 |   4 |        12 | Crítico |
|          3 | R06 | T06    | Autorização limitada é ampliada.                                      |   3 |   4 |        12 | Crítico |
|          4 | R03 | T03    | Perfil, paciente, recurso ou operação fora do privilégio é alcançado. |   3 |   4 |        12 | Crítico |
|          5 | R02 | T02    | Conta ou token comprometido é usado em nome da vítima.                |   3 |   4 |        12 | Crítico |
|          6 | R10 | T10    | Documento médico é exposto por link indevido.                         |   3 |   4 |        12 | Crítico |
|          7 | R01 | T01    | Falso profissional obtém acesso autorizado pelo paciente.             |   2 |   4 |         8 | Alto    |
|          8 | R07 | T07    | Informação clínica é criada ou alterada indevidamente.                |   2 |   4 |         8 | Alto    |
|          9 | R08 | T08    | Registro clínico é excluído ou ocultado.                              |   2 |   4 |         8 | Alto    |
|         10 | R11 | T11    | Dados de múltiplos pacientes são extraídos pela API.                  |   2 |   4 |         8 | Alto    |
|         11 | R15 | T15    | Arquivo ou referência clínica é corrompido ou perdido.                |   2 |   4 |         8 | Alto    |
|         12 | R13 | T13    | Sobrecarga indisponibiliza API ou banco.                              |   3 |   3 |         9 | Alto    |
|         13 | R12 | T12    | Compartilhamento não possui rastreabilidade suficiente.               |   3 |   3 |         9 | Alto    |
|         14 | R09 | T09    | Ação relevante não pode ser atribuída ao autor.                       |   2 |   3 |         6 | Médio   |
|         15 | R14 | T14    | Upload massivo esgota o armazenamento.                                |   2 |   3 |         6 | Médio   |

P=3 representa cenário plausível com recursos comuns ou uso normal da API. P=2 depende de condição específica ainda não comprovada. I=4 representa exposição, alteração ou perda de informação clínica; I=3 representa indisponibilidade ou perda relevante com recuperação possível. Essas justificativas são inferências de planejamento, não medições do sistema.

## Plano de tratamento e residual estimado

| Riscos        | Estratégia e controle proposto                                                                                                                                                             | NIST CSF 2.0                              | Responsável proposto             | Evidência necessária                                                        | Residual esperado |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | -------------------------------- | --------------------------------------------------------------------------- | ----------------- |
| R04–R06, R03  | Decidir no servidor usando identidade, paciente, recurso, operação, escopo, período e estado `Ativa`; negar por padrão.                                                                    | Govern, Protect, Detect, Respond          | Desenvolvimento                  | Testes negativos de acesso cruzado, escopo e revogação.                     | Alto (2×4)        |
| R02, R01      | Validar profissional; proteger recuperação, sessão e credenciais.                                                                                                                          | Govern, Protect, Detect, Respond, Recover | Desenvolvimento e Segurança      | Testes de cadastro, recuperação e revogação de sessão.                      | Médio (1×4)       |
| R07, R08, R15 | Autorizar escrita e exclusão, preservar versão e executar restauração verificável.                                                                                                         | Protect, Detect, Respond, Recover         | Desenvolvimento e Infraestrutura | Testes de escrita indevida, exclusão e restauração.                         | Médio (1×4)       |
| R09, R12      | Registrar ator, ação, alvo, resultado e tempo sem segredos; restringir alteração dos registros.                                                                                            | Govern, Protect, Detect, Respond          | Desenvolvimento                  | Teste que produz evento completo e verifica integridade.                    | Baixo (1×3)       |
| R10, R11      | Não oferecer link público; exigir sessão e autorização por documento, usando identificador imprevisível apenas como referência sem autoridade; limitar consultas e alertar volume anômalo. | Protect, Detect, Respond, Recover         | Desenvolvimento e Infraestrutura | Testes de ausência de rota pública, acesso fora do escopo, limite e alerta. | Médio (1×4)       |
| R13, R14      | Limitar requisições, tamanho, tipo e quota de uploads; monitorar capacidade e recuperar serviço.                                                                                           | Protect, Detect, Respond, Recover         | Infraestrutura                   | Teste de carga controlado, upload bloqueado e métrica de capacidade.        | Médio (2×3)       |

As funções NIST organizam resultados e não são controles por si só. Nenhum risco residual é aceito no estado atual: o aceite futuro exige responsável nomeado, implementação, teste bem-sucedido e evidência versionada.

## Ordem inicial de implementação

1. Implementar autorização por recurso, operação, escopo e período, incluindo revogação imediata.
2. Proteger identidade, sessão e validação profissional.
3. Implementar auditoria de ações críticas e proteção contra alteração dos registros.
4. Proteger escrita, exclusão, integridade e recuperação de documentos.
5. Limitar compartilhamento, consultas, uploads e capacidade da infraestrutura.

Essa ordem reduz primeiro os caminhos que permitem acesso indevido a dados médicos e depois fortalece rastreabilidade, integridade e disponibilidade.

## Considerações finais

R01–R15 cobrem todas as ameaças T01–T15 e mantêm a rastreabilidade com os casos de abuso da Etapa 1. A documentação conclui o plano de análise e tratamento, mas não comprova a redução real dos riscos sem código, testes, execução e relatórios.
