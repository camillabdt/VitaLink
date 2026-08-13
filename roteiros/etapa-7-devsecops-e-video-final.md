# Etapa 7 — DevSecOps e roteiro do vídeo final

## Estado da etapa

Esta etapa integra os artefatos produzidos ao longo das Etapas 1 a 6 em uma visão de ciclo de desenvolvimento seguro.

O VitaLink ainda não possui uma aplicação executável nem um pipeline automatizado de CI/CD capaz de compilar, testar e implantar o sistema. Portanto, o pipeline DevSecOps apresentado abaixo é **proposto e rastreável aos artefatos existentes**, mas não deve ser apresentado como automação já executada.

Há, entretanto, uma diferença importante entre as atividades:

- as Etapas 1, 2 e 3 possuem documentação de segurança versionada;
- a Etapa 4 possui práticas, pseudocódigo e testes planejados, mas não código executável do VitaLink;
- a Etapa 5 possui uma verificação prática executada com OWASP ZAP sobre o OWASP Juice Shop, utilizada como ambiente didático enquanto o VitaLink não possui implementação;
- a Etapa 6 possui regras e roteiro de detecção e resposta propostos, ainda sem monitoramento executável;
- o vídeo final permanece pendente de gravação e publicação.

## Pipeline DevSecOps proposto

| Momento | Atividade de segurança | Evidência atual | Condição para avançar | Estado |
| --- | --- | --- | --- | --- |
| Planejamento | Definir escopo, ativos, perfis, CIA, casos de abuso e modelagem STRIDE | Documentação das Etapas 1 e artefatos de apoio | Ativos, atores, ameaças e casos de abuso devem estar consistentes e rastreáveis | Documentado |
| Análise de risco | Avaliar probabilidade, impacto, prioridade, tratamento e risco residual | Registro R01–R15 da Etapa 2 | Riscos altos e críticos devem possuir tratamento proposto e rastreabilidade | Documentado |
| Requisitos e arquitetura | Transformar riscos em requisitos e decisões arquiteturais de segurança | RS01–RS09, V01–V09, DA01–DA09 e diagrama da Etapa 3 | Riscos prioritários devem possuir requisito ou decisão correspondente | Documentado |
| Implementação segura | Aplicar práticas de código seguro definidas na Etapa 4 | CS01–CS10, pseudocódigo e CT01–CT10 | Código deve implementar os controles antes de ser apresentado como mitigação | Planejado |
| Testes de segurança | Executar os casos CT01–CT10 sobre o VitaLink | Casos de teste definidos, sem execução sobre o sistema | Nenhum controle deve ser considerado comprovado sem teste executável correspondente | Pendente de implementação |
| Verificação dinâmica | Executar DAST em ambiente controlado | Relatórios reais do ZAP produzidos na Etapa 5 sobre o OWASP Juice Shop | Achados relevantes devem ser analisados; quando o VitaLink existir, a verificação deverá ser repetida diretamente sobre ele | Executado em ambiente didático |
| Revisão de configuração e segredos | Verificar configuração, credenciais, dependências e artefatos antes da integração | Critérios definidos nas etapas anteriores | Nenhum segredo ou dado médico real deve ser versionado; achados críticos não podem permanecer sem análise | Planejado |
| Integração e entrega | Integrar somente alterações revisadas e rastreáveis | Histórico Git e pull requests | Alterações devem passar pelas verificações aplicáveis antes de chegar à branch de integração | Processo de projeto |
| Monitoramento | Gerar eventos e aplicar D01–D08 | Regras e roteiro da Etapa 6 | Eventos críticos devem possuir fonte de dados, regra e resposta inicial | Planejado |
| Resposta e recuperação | Triar, conter, investigar, corrigir e recuperar | Roteiro da Etapa 6 | Incidentes confirmados devem possuir tratamento, registro e acompanhamento | Planejado |

## Gates de segurança

Um pipeline DevSecOps futuro do VitaLink não deve permitir avanço automático quando ocorrer qualquer uma das seguintes condições:

1. teste de segurança obrigatório reprovado;
2. falha de autorização entre usuários, pacientes ou recursos;
3. autorização revogada ou expirada ainda aceita;
4. segredo, senha, token ou credencial encontrado no repositório;
5. dado médico real incluído em código, teste, log ou artefato de CI;
6. dependência com vulnerabilidade crítica conhecida sem análise ou tratamento;
7. achado crítico de análise dinâmica sem triagem;
8. falha na produção da evidência de auditoria exigida para uma operação crítica;
9. alteração de requisito ou arquitetura que quebre a rastreabilidade com os riscos documentados.

A implementação concreta desses gates depende da tecnologia escolhida para o sistema.

## Pipeline automatizado futuro

Quando existir código executável, uma automação de CI/CD deverá, no mínimo, considerar a seguinte sequência:

```text
Alteração no código
        |
        v
Verificação de formatação e qualidade
        |
        v
Testes funcionais
        |
        v
Testes de segurança CT01–CT10
        |
        v
Análise de dependências
        |
        v
Verificação de segredos
        |
        v
Build
        |
        v
Ambiente de teste
        |
        v
DAST
        |
        v
Análise dos resultados
        |
        +---- falha crítica ----> bloquear
        |
        v
Entrega controlada
        |
        v
Monitoramento D01–D08
```

Esse fluxo é uma especificação arquitetural do processo e não representa uma execução existente no repositório.

## Evidência prática disponível no ciclo

A Etapa 5 introduziu uma evidência prática que pode ser utilizada para demonstrar a fase de verificação de um ciclo DevSecOps.

Foram versionados:

- [relatório HTML do OWASP ZAP](../evidencias/etapa-5/zap-report.html);
- [relatório JSON do OWASP ZAP](../evidencias/etapa-5/zap-report.json);
- configuração auxiliar `zap.yaml`;
- análise dos principais resultados em [Etapa 5](../docs/etapa5-verificacao-de-seguranca.md).

A execução observou 88 URLs no OWASP Juice Shop e produziu 59 verificações classificadas como PASS e 8 categorias WARN-NEW, sem FAIL-NEW na execução do baseline.

Esses números descrevem somente o ambiente didático analisado e não podem ser apresentados como resultado de segurança do VitaLink.

## Correspondência entre as etapas

| Etapa | Tema | Artefatos principais |
| --- | --- | --- |
| Base | Escopo e sistema | [escopo](../docs/escopo-problema-justificativa.md), [componentes](../docs/componentes-do-sistema.md), [pontos de interação](../docs/pontos-de-interacao.md) |
| Etapa 1 | Ameaças, STRIDE e casos de abuso | [modelagem](../docs/etapa1-modelagem-de-ameacas.md), [casos de abuso](../docs/casos-de-abuso.md) |
| Etapa 2 | Avaliação e tratamento de riscos | [riscos](../docs/etapa2-riscos-e-tratamento.md), [critérios](../docs/etapa2-criterios-e-risco-residual.md) |
| Etapa 3 | Arquitetura segura | [arquitetura](../docs/etapa3-arquitetura-segura.md), [diagrama](../docs/diagramas/arquitetura-segura.mmd) |
| Etapa 4 | Código seguro | [práticas e testes planejados](../docs/etapa4-codigo-seguro.md) |
| Etapa 5 | Verificação de segurança | [análise](../docs/etapa5-verificacao-de-seguranca.md), [evidências](../evidencias/etapa-5/) |
| Etapa 6 | Detecção e resposta | [monitoramento e resposta](etapa-6-deteccao-de-intrusoes.md) |
| Etapa 7 | DevSecOps e apresentação | Este documento |

# Roteiro do vídeo final

## Situação

O vídeo ainda não foi produzido. Esta seção define um roteiro de apresentação para evitar que o grupo apresente controles planejados como se fossem implementados.

A distribuição nominal das falas deve respeitar a autoria e a participação real registradas no histórico do projeto. Este documento não redefine autoria de artefatos.

## Duração sugerida

Duração alvo: **5 a 8 minutos**.

## Estrutura sugerida

| Tempo aproximado | Bloco | Conteúdo |
| --- | --- | --- |
| 0:00–0:40 | Apresentação | Nome VitaLink, problema tratado, objetivo e escopo acadêmico |
| 0:40–1:30 | Sistema e ativos | Paciente, profissional, ativos A01–A12, dados médicos e pontos de interação |
| 1:30–2:40 | Etapa 1 | STRIDE, casos de abuso CA01–CA10 e exemplos de ameaças T01–T15 |
| 2:40–3:40 | Etapa 2 | Método de avaliação, matriz de risco e riscos prioritários |
| 3:40–4:50 | Etapa 3 | Requisitos RS01–RS09, principais decisões arquiteturais e diagrama |
| 4:50–5:50 | Etapa 4 | Práticas CS01–CS10, exemplos de pseudocódigo e testes CT01–CT10 |
| 5:50–7:00 | Etapa 5 | OWASP Juice Shop, OWASP ZAP, execução real e três achados analisados |
| 7:00–8:00 | Etapa 6 | Regras D01–D08, monitoramento e fluxo de resposta a incidentes |
| 8:00–9:00 | Etapa 7 | Pipeline DevSecOps, gates de segurança e integração das etapas |
| 9:00–10:00 | Encerramento | Limitações, aprendizados, participação e próximos passos |

## Conteúdo mínimo de cada bloco

### Abertura

Apresentar:

- nome do sistema;
- objetivo do VitaLink;
- atores Paciente e Profissional de Saúde;
- natureza acadêmica do projeto;
- ausência atual de aplicação executável.

Evitar afirmar que o VitaLink já é um sistema implantado ou operacional.

### Etapa 1 — Modelagem de ameaças

Mostrar:

- ativos relevantes;
- categorias STRIDE;
- casos de abuso;
- uma ou duas ameaças representativas;
- relação ameaça → ativo → caso de abuso.

Não é necessário ler todas as tabelas durante o vídeo.

### Etapa 2 — Riscos

Explicar:

- escala de probabilidade e impacto;
- cálculo de risco;
- faixas Baixo, Médio, Alto e Crítico;
- exemplos de riscos prioritários;
- diferença entre risco inerente e residual proposto.

Não afirmar que o risco residual foi medido em produção.

### Etapa 3 — Arquitetura

Mostrar:

- diagrama;
- separação entre cliente, API, banco e armazenamento;
- autorização no servidor;
- revogação;
- auditoria;
- integridade;
- compartilhamento;
- disponibilidade.

Deixar explícito que são decisões arquiteturais propostas.

### Etapa 4 — Código seguro

Apresentar:

- algumas práticas CS;
- pseudocódigo de autorização;
- exemplos de CTs planejados;
- necessidade de código e teste executável para comprovação.

Não dizer que CT01–CT10 passaram, porque ainda não foram executados sobre o VitaLink.

### Etapa 5 — Verificação

Esta é a principal evidência prática já produzida.

Apresentar:

- motivo do uso do OWASP Juice Shop;
- execução em Docker;
- ferramenta OWASP ZAP;
- tipo Baseline Scan;
- 88 URLs observadas;
- 59 PASS;
- 8 WARN-NEW;
- 0 FAIL-NEW;
- A01 — CSP Header Not Set;
- A02 — Cross-Domain Misconfiguration;
- A03 — Dangerous JS Functions.

Deixar explícito:

> Os achados pertencem ao OWASP Juice Shop e demonstram o processo de verificação. Eles não são vulnerabilidades encontradas no VitaLink.

### Etapa 6 — Detecção e resposta

Apresentar exemplos como:

- D01 — repetição de negações de autorização;
- D03 — sobrecarga de requisição ou upload;
- D05 — uso de link expirado ou revogado;
- D06 — possível extração em massa;
- D07 — tentativa de alteração ou exclusão indevida;
- D08 — falha de auditoria.

Explicar resumidamente:

```text
detectar -> triar -> conter -> investigar -> corrigir -> recuperar
```

### Etapa 7 — DevSecOps

Mostrar que segurança está distribuída ao longo do ciclo:

```text
ameaças
  -> riscos
  -> requisitos
  -> código seguro
  -> testes
  -> verificação
  -> entrega
  -> monitoramento
  -> resposta
```

Explicar que o pipeline completo ainda é proposto porque não existe aplicação executável.

## Demonstração recomendada no vídeo

Se houver tempo, a demonstração técnica mais forte disponível é abrir:

1. `docs/etapa5-verificacao-de-seguranca.md`;
2. `evidencias/etapa-5/zap-report.html`;
3. um dos alertas analisados;
4. o diagrama da arquitetura;
5. o histórico Git com as contribuições do grupo.

Isso permite apresentar evidência real sem simular implementação inexistente.

## Checklist antes de gravar

- [ ] Todas as alterações finais foram integradas à branch de entrega.
- [ ] Links internos do README e documentos foram conferidos.
- [ ] Diagrama final está legível.
- [ ] Relatórios da Etapa 5 abrem corretamente.
- [ ] Nenhum segredo ou dado médico real está versionado.
- [ ] Cada integrante sabe qual artefato realmente produziu.
- [ ] Ninguém apresenta pseudocódigo como código executado.
- [ ] Ninguém apresenta risco residual proposto como resultado medido.
- [ ] Ninguém apresenta os achados do Juice Shop como vulnerabilidades do VitaLink.
- [ ] A situação do pipeline é descrita como proposta.
- [ ] O link do vídeo será adicionado somente depois da publicação.

## Evidência do vídeo

**Estado atual: pendente.**

Quando o vídeo for gravado e publicado, registrar nesta seção:

```text
Título:
Plataforma:
URL:
Data de publicação:
Duração:
```

O link não deve ser inventado ou preenchido antes da publicação efetiva.

## Limitações finais

- não há aplicação executável do VitaLink;
- não há testes CT01–CT10 executados sobre o VitaLink;
- não há pipeline CI/CD executável versionado;
- não há monitoramento D01–D08 ativo;
- o DAST realizado na Etapa 5 utilizou um ambiente didático externo ao VitaLink;
- o vídeo ainda depende de gravação e publicação.

Essas limitações devem ser apresentadas como estado real do projeto e não ocultadas pela documentação.
