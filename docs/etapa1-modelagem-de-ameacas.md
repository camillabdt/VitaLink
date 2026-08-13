# Etapa 1 — Modelagem de ameaças e casos de abuso

## Escopo

Este índice consolida a modelagem STRIDE do VitaLink. As ameaças são cenários de projeto, não achados de implementação. Os detalhes de cada grupo estão nos documentos vinculados; controles e evidências técnicas permanecem **[A confirmar]** enquanto não houver código ou testes versionados.

## Tabela STRIDE consolidada

| ID | STRIDE | Cenário | Ativos | Caso de abuso | Fonte |
| --- | --- | --- | --- | --- | --- |
| T01 | Spoofing | Falso profissional obtém acesso. | A02–A06, A09, A12 | CA01 | [Identidade](ameacas-identidade-autenticacao-privilegios.md) |
| T02 | Spoofing | Credencial ou token roubado é usado como a vítima. | A01, A03–A10 | CA02 | [Identidade](ameacas-identidade-autenticacao-privilegios.md) |
| T03 | Elevation of Privilege | Perfil, paciente, recurso ou operação fora do privilégio é alcançado. | A03–A10 | CA01, CA02, CA04 | [Identidade](ameacas-identidade-autenticacao-privilegios.md) |
| T04 | Information Disclosure | Dados médicos são consultados sem autorização ativa. | A03–A05, A08–A10, A12 | CA04 | [Consentimento](ameacas-consentimento-acesso-indevido.md) |
| T05 | Information Disclosure; Elevation of Privilege | Acesso continua após revogação ou expiração. | A03–A10 | CA03 | [Consentimento](ameacas-consentimento-acesso-indevido.md) |
| T06 | Elevation of Privilege; Information Disclosure | Autorização limitada é ampliada. | A03–A05, A08–A10, A12 | CA04 | [Consentimento](ameacas-consentimento-acesso-indevido.md) |
| T07 | Tampering | Documento ou registro médico é criado ou alterado sem autorização. | A03–A05, A08–A10, A12 | CA05 | [Integridade](ameacas-integridade-documentos-medicos.md) |
| T08 | Tampering | Documento, registro ou referência é excluído indevidamente. | A03–A05, A08–A10, A12 | CA06 | [Integridade](ameacas-integridade-documentos-medicos.md) |
| T09 | Repudiation | Ação crítica não pode ser atribuída ao autor. | A03–A05, A08–A10 | CA05, CA06 | [Rastreabilidade](ameacas-repudio-ausencia-rastreabilidade.md) |
| T10 | Information Disclosure | Documento é exposto por link indevido. | A03–A05, A09, A12 | CA07 | [Privacidade](ameacas-exposicao-de-dados.md) |
| T11 | Information Disclosure; Repudiation | API permite extração em massa de dados. | A01, A03, A08–A10 | CA08 | [Privacidade](ameacas-exposicao-de-dados.md) |
| T12 | Repudiation; Information Disclosure | Compartilhamento ocorre sem rastreabilidade suficiente. | A03–A05, A08–A10 | CA07, CA08 | [Privacidade](ameacas-exposicao-de-dados.md) |
| T13 | Denial of Service | Requisições esgotam a capacidade da API, servidor ou banco. | A09–A11 | CA09 | [Disponibilidade](ameacas-disponibilidade.md) |
| T14 | Denial of Service | Uploads esgotam o armazenamento. | A04, A11, A12 | CA10 | [Disponibilidade](ameacas-disponibilidade.md) |
| T15 | Tampering; Denial of Service | Arquivos ou referências são corrompidos ou perdidos. | A04, A05, A10, A12 | CA05, CA06 | [Disponibilidade](ameacas-disponibilidade.md) |

Todas as seis categorias STRIDE são cobertas. Os IDs T01–T15 são únicos e cada ameaça está ligada a um ou mais abusos.

## Casos de abuso

| ID | Título | Ator e objetivo resumidos | Ameaças | Fonte |
| --- | --- | --- | --- | --- |
| CA01 | Cadastro de falso profissional | Ator cria perfil profissional fraudulento para obter confiança e acesso. | T01, T03 | [Identidade](casos-de-abuso-identidade.md) |
| CA02 | Roubo da conta de um paciente | Ator usa credencial ou sessão da vítima para agir em seu nome. | T02, T03 | [Identidade](casos-de-abuso-identidade.md) |
| CA03 | Uso de autorização revogada | Profissional ou atacante mantém acesso após revogação. | T04, T05 | [Catálogo](casos-de-abuso.md) |
| CA04 | Consulta a prontuário sem autorização | Ator consulta recurso fora de paciente, operação ou escopo permitido. | T04, T06 | [Catálogo](casos-de-abuso.md) |
| CA05 | Alteração maliciosa de exame | Ator cria ou altera informação clínica sem autorização. | T07, T09, T15 | [Integridade](casos-de-abuso-integridade.md) |
| CA06 | Exclusão de registro | Ator remove dado ou referência para ocultar ação ou causar perda. | T08, T09, T15 | [Integridade](ameacas-integridade-documentos-medicos.md) |
| CA07 | Compartilhamento público de documento | Terceiro usa link exposto para obter dado médico. | T10, T12 | [Privacidade](casos-de-abuso-privacidade.md) |
| CA08 | Extração em massa de informações | Ator automatiza consultas para exfiltrar dados de muitos pacientes. | T11, T12 | [Privacidade](casos-de-abuso-privacidade.md) |
| CA09 | Sobrecarga da API | Ator envia requisições para impedir uso legítimo. | T13 | [Disponibilidade](ameacas-disponibilidade.md) |
| CA10 | Esgotamento do armazenamento | Ator envia arquivos para esgotar capacidade. | T14 | [Disponibilidade](ameacas-disponibilidade.md) |

Os documentos vinculados descrevem ator, objetivo, condições, fluxo, impacto e categorias STRIDE. A [Etapa 2](etapa2-riscos-e-tratamento.md) transforma T01–T15 em R01–R15.

## Considerações finais

Os ativos prioritários são os dados e documentos médicos, seguidos por autorização, auditoria, API e armazenamento. O maior impacto esperado decorre de acesso indevido, alteração de informação clínica, vazamento em massa e indisponibilidade durante atendimento. A principal dificuldade documental foi manter IDs e relações consistentes entre contribuições separadas. A principal limitação é não haver implementação executável para confirmar ou refutar as condições de exploração.
