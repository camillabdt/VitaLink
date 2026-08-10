# Riscos de consentimento e permissões

Este documento registra os riscos R04, R05 e R06 relacionados às ameaças de consentimento e controle de acesso do VitaLink.

A avaliação utiliza os critérios definidos em `etapa2-criterios-e-risco-residual.md`, com probabilidade e impacto variando de 1 a 4 e cálculo do risco pela fórmula:

**Risco = Probabilidade × Impacto**

As ameaças de referência são T04, T05 e T06, documentadas em `ameacas-consentimento-acesso-indevido.md`.

## Registro de riscos

| ID  | Risco                                           | Ameaça | Probabilidade | Impacto | Pontuação | Nível   |
| --- | ----------------------------------------------- | ------ | ------------: | ------: | --------: | ------- |
| R04 | Prontuário acessado sem autorização             | T04    |             3 |       4 |        12 | Crítico |
| R05 | Autorização revogada continua permitindo acesso | T05    |             2 |       4 |         8 | Alto    |
| R06 | Escopo da permissão é ampliado indevidamente    | T06    |             3 |       4 |        12 | Crítico |

## R04 — Prontuário acessado sem autorização

**Ameaça relacionada:** T04 — Acesso sem autorização.

**Caso de abuso relacionado:** CA04 — Consulta a prontuário sem autorização.

**Ativos principais:** A03, A04, A05, A08, A09, A10 e A12.

### Probabilidade — 3 (Média-alta)

O acesso a prontuários e documentos faz parte do fluxo normal de utilização do VitaLink por profissionais autorizados. Caso a API não valide a autorização específica para o paciente, o recurso e a operação solicitados, um usuário autenticado pode tentar acessar outro identificador utilizando recursos comuns da própria aplicação.

A exploração depende de uma falha de autorização no servidor, porém não exige necessariamente conhecimento avançado ou acesso administrativo. Por isso, a ocorrência é considerada plausível em um sistema que ainda não tenha implementado e validado seus controles de autorização.

### Impacto — 4 (Muito alto)

Uma exploração bem-sucedida pode expor informações médicas sensíveis, incluindo histórico médico, exames, receitas, laudos e imagens.

Além da quebra de confidencialidade, o incidente pode comprometer a confiança do paciente no sistema, gerar problemas de privacidade e produzir consequências legais e regulatórias relacionadas ao tratamento de dados de saúde.

### Pontuação

**3 × 4 = 12 — Crítico**

### Estratégia de tratamento

**Reduzir.**

O risco faz parte do funcionamento central do VitaLink e não pode ser simplesmente evitado removendo o compartilhamento de informações entre pacientes e profissionais. Portanto, devem ser implementados controles que reduzam sua probabilidade.

---

## R05 — Autorização revogada continua permitindo acesso

**Ameaça relacionada:** T05 — Uso de autorização revogada ou expirada.

**Caso de abuso relacionado:** CA03 — Uso de autorização revogada.

**Ativos principais:** A03, A04, A05, A07, A08, A09, A10 e A12.

### Probabilidade — 2 (Média-baixa)

Para que o risco ocorra, o profissional precisa ter recebido anteriormente uma autorização válida e manter uma sessão, token ou decisão de autorização que não tenha sido corretamente atualizada após a revogação ou expiração.

O cenário exige mais condições que R04 e R06, principalmente a existência de uma autorização anterior e uma falha na atualização de seu estado. Por isso, sua probabilidade é classificada como média-baixa.

### Impacto — 4 (Muito alto)

Embora o acesso tenha sido legítimo anteriormente, após a revogação ou expiração o profissional deixa de possuir autorização.

Permitir novos acessos após essa decisão viola diretamente o controle do paciente sobre seus dados e pode expor informações médicas sensíveis por um período indefinido.

### Pontuação

**2 × 4 = 8 — Alto**

### Estratégia de tratamento

**Reduzir.**

O VitaLink precisa permitir que pacientes concedam e retirem autorizações. Portanto, o processo não pode ser eliminado, mas seus estados e efeitos precisam ser aplicados de forma consistente.

---

## R06 — Escopo da permissão é ampliado indevidamente

**Ameaça relacionada:** T06 — Ampliação indevida da permissão.

**Caso de abuso relacionado:** CA04 — Consulta a prontuário sem autorização, quando uma autorização limitada é utilizada para alcançar outro paciente, recurso ou operação.

**Ativos principais:** A03, A04, A05, A08, A09, A10 e A12.

### Probabilidade — 3 (Média-alta)

Um profissional autorizado já possui acesso legítimo a determinadas funcionalidades e pode enviar solicitações normais à API.

Caso o servidor confie em identificadores, operações ou informações de escopo recebidas do cliente sem compará-las com a autorização efetivamente concedida pelo paciente, a tentativa de ampliar o acesso exige poucos recursos adicionais.

Por isso, a exploração é considerada plausível quando não há autorização por recurso e operação.

### Impacto — 4 (Muito alto)

O atacante pode alcançar dados de outros pacientes, tipos de documentos ou operações que não foram autorizados.

Isso pode resultar tanto em exposição quanto em alteração indevida de informações médicas sensíveis e comprometer a integridade das decisões de consentimento.

### Pontuação

**3 × 4 = 12 — Crítico**

### Estratégia de tratamento

**Reduzir.**

O compartilhamento granular faz parte do objetivo do VitaLink. Assim, a mitigação deve ocorrer por meio de autorização baseada no recurso, operação e escopo efetivamente concedidos.

---

# Plano de tratamento

| Risco | Controle proposto                                                                              | Função NIST CSF 2.0 | Responsável                                | Evidência esperada                                                              |
| ----- | ---------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| R04   | Validar autorização ativa para paciente, recurso e operação em todas as requisições protegidas | Protect             | Responsável pela API e controle de acesso  | Testes demonstrando bloqueio de acesso a paciente não autorizado                |
| R04   | Aplicar política de negação por padrão quando não existir autorização válida                   | Protect             | Responsável pela API e controle de acesso  | Testes automatizados de autorização negativa                                    |
| R04   | Registrar acessos permitidos e tentativas negadas                                              | Detect              | Responsável por auditoria e backend        | Registros de auditoria contendo usuário, recurso, operação, horário e resultado |
| R05   | Consultar o estado atual da autorização antes de cada novo acesso                              | Protect             | Responsável pela API e autorização         | Teste demonstrando bloqueio imediatamente após revogação                        |
| R05   | Invalidar ou impedir o uso de decisões, sessões ou tokens que preservem permissões revogadas   | Protect             | Responsável por autenticação e autorização | Testes de sessão e token após revogação                                         |
| R05   | Detectar tentativas de uso de autorização revogada ou expirada                                 | Detect              | Responsável por auditoria                  | Evento de auditoria de tentativa bloqueada                                      |
| R05   | Encerrar ou conter acessos relacionados após revogação                                         | Respond             | Responsável pela API e autenticação        | Evidência de bloqueio das novas operações após revogação                        |
| R06   | Aplicar autorização por recurso e operação no servidor                                         | Protect             | Responsável pela API e controle de acesso  | Testes tentando alterar identificador, recurso e operação                       |
| R06   | Aplicar princípio do menor privilégio ao perfil profissional                                   | Protect             | Responsável por controle de acesso         | Matriz de permissões e testes correspondentes                                   |
| R06   | Não confiar em escopo ou perfil informado pelo cliente para conceder acesso                    | Protect             | Responsável pela API                       | Teste demonstrando rejeição de escopo manipulado                                |
| R06   | Registrar tentativas de acesso fora do escopo autorizado                                       | Detect              | Responsável por auditoria                  | Logs contendo tentativa, identidade, recurso e resultado                        |

## Relação complementar com o NIST CSF 2.0

Além das funções diretamente relacionadas aos controles, os três riscos também envolvem:

* **Govern:** definição das regras de consentimento, responsabilidades e critérios para aceitação do risco residual;
* **Identify:** identificação dos ativos, autorizações, ameaças e riscos envolvidos;
* **Protect:** aplicação dos controles de autenticação e autorização;
* **Detect:** registro e identificação de tentativas de acesso indevido;
* **Respond:** contenção de sessões, acessos e permissões quando uma autorização deixa de ser válida.

A função **Recover** possui menor relação direta com a prevenção desses três riscos, mas pode ser necessária caso um incidente provoque alteração indevida de informações ou seja necessário restaurar dados e estados confiáveis.

# Estimativa de risco residual

Os valores abaixo representam uma estimativa considerando que os controles propostos sejam implementados corretamente e posteriormente validados.

| Risco | Nível inicial | Probabilidade residual | Impacto residual | Pontuação residual | Nível residual |
| ----- | ------------- | ---------------------: | ---------------: | -----------------: | -------------- |
| R04   | Crítico (12)  |                      1 |                4 |                  4 | Médio          |
| R05   | Alto (8)      |                      1 |                4 |                  4 | Médio          |
| R06   | Crítico (12)  |                      1 |                4 |                  4 | Médio          |

O impacto residual permanece em 4 porque, caso um controle seja efetivamente contornado, os dados envolvidos continuam sendo informações médicas sensíveis. Os controles propostos atuam principalmente na redução da probabilidade de exploração.

## Condições para aceite do risco residual

O nível residual somente poderá ser considerado aceitável quando existirem evidências de que:

* acessos a pacientes sem autorização são bloqueados;
* autorizações revogadas ou expiradas não permitem novas operações;
* alterações de identificadores ou escopo não ampliam permissões;
* as verificações ocorrem no servidor e não apenas na interface;
* tentativas permitidas e negadas geram registros de auditoria;
* os testes de autorização negativa sejam executados com sucesso.

Enquanto essas evidências não existirem, os valores de risco residual permanecem apenas como **estimativa**.

## Dependência documental

A análise utiliza T04, T05 e T06 já consolidadas na Issue #7.

Os casos CA03 e CA04 pertencem à Issue #12. Caso sua versão final seja alterada antes do merge, a rastreabilidade deste documento deverá ser revisada antes da integração da Issue #17.
