# Etapa 3 — Requisitos e decisões arquiteturais de segurança

## Status

Os requisitos, vulnerabilidades e decisões abaixo são **propostos** a partir das ameaças e riscos documentados. O repositório não contém implementação arquitetural verificável. Logo, nenhuma decisão é evidência de controle implementado.

O diagrama-fonte versionado está em [arquitetura-segura.mmd](diagramas/arquitetura-segura.mmd). Ele representa a arquitetura pretendida, não o estado executável.

## Requisitos de segurança propostos

| ID | Requisito verificável | Origem |
| --- | --- | --- |
| RS01 | A API deve decidir no servidor o acesso a dados médicos comparando identidade autenticada, paciente, recurso, operação, estado `Ativa` e período da autorização. | T03–T06, R03–R06 |
| RS02 | Após revogação ou expiração, a API deve negar novos acessos ao escopo encerrado, inclusive em sessão já iniciada, e registrar o resultado. | T05, R05 |
| RS03 | Ações de solicitação, decisão, consulta e alteração de dados médicos devem registrar ator, alvo, operação, resultado e tempo, sem registrar segredo ou conteúdo integral do documento. | T07, R10 |

## Vulnerabilidades associadas

| ID | Vulnerabilidade candidata | Requisito que trata | Ameaças |
| --- | --- | --- | --- |
| V01 | Falta de autorização no servidor por recurso e operação, ou confiança em identificador do cliente. | RS01 | T03, T04, T06 |
| V02 | Decisão de autorização reutilizada após revogação ou expiração. | RS02 | T05 |
| V03 | Evento crítico sem registro suficiente para atribuição e investigação. | RS03 | T07 |

V01–V03 são condições a evitar no projeto. Não são achados no código, pois não há código do sistema disponível para análise.

## Decisões arquiteturais propostas

| ID | Decisão | Rastreabilidade | Critério de aceitação futuro |
| --- | --- | --- | --- |
| DA01 | Centralizar a decisão de autorização na API antes de leitura ou escrita de dado médico. O cliente apenas solicita a operação. | RS01, V01, T03–T06 | Teste com identificador de outro paciente deve ser negado no servidor. |
| DA02 | Persistir autorização com paciente, profissional, escopo, operações, estado e período; reavaliar esse registro para cada acesso relevante. | RS02, V02, T05 | Teste após revogação e expiração deve negar novo acesso. |
| DA03 | Emitir evento de auditoria no serviço da API para ações críticas e restringir a alteração dos registros pelos perfis de usuário. | RS03, V03, T07 | Teste deve produzir registro com os campos mínimos, sem segredo. |

As tecnologias e a separação física dos componentes serão escolhidas na implementação. DS03, DS06 e DS08 já definem o comportamento obrigatório de sessão, autorização e auditoria; as decisões devem ser revisadas antes do código.
