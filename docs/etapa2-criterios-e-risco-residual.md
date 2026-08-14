# Etapa 2 — Critérios de Avaliação de Riscos e Modelo de Risco Residual

**Projeto:** VitaLink
**Disciplina:** Engenharia de Software Seguro
**Contribuição de:** Luiza de Campos Velasque Figueiredo

Este documento define os critérios utilizados para avaliar a **probabilidade** e o **impacto** dos riscos identificados no VitaLink, além do modelo que orientará a análise de **risco residual** após a aplicação de controles. Serve como base metodológica para a Etapa 2, complementando a modelagem de ameaças (STRIDE) já realizada pelo grupo.

---

## 1. Critérios de Probabilidade

A probabilidade representa a chance de uma ameaça ser explorada com sucesso, considerando o cenário atual do sistema. A avaliação leva em conta:

- facilidade de exploração da vulnerabilidade;
- frequência com que a condição de exploração pode ocorrer;
- condições necessárias para que o ataque seja viável;
- necessidade (ou não) de acesso privilegiado por parte do atacante;
- contexto do sistema, incluindo exposição e controles já existentes.

| Valor | Classificação | Critério                                                                                                                                                  |
| ----- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Baixa         | A exploração exige condições muito específicas, conhecimento avançado ou acesso privilegiado difícil de obter. Ocorrência pouco provável.                 |
| 2     | Média-baixa   | A exploração é possível, mas depende de certas condições ou de um nível moderado de conhecimento técnico. Ocorrência pontual.                             |
| 3     | Média-alta    | A exploração pode ser realizada com recursos e conhecimento comuns, exigindo pouco ou nenhum acesso privilegiado. Ocorrência plausível em cenários reais. |
| 4     | Alta          | A exploração é simples, não exige acesso privilegiado e pode ser repetida com baixo esforço. Ocorrência esperada caso o risco não seja tratado.           |

---

## 2. Critérios de Impacto

O impacto representa a gravidade das consequências caso a ameaça se concretize. A avaliação considera:

- prejuízo causado aos usuários (pacientes e profissionais de saúde);
- exposição de dados, especialmente informações médicas sensíveis;
- perdas financeiras decorrentes do incidente;
- indisponibilidade do sistema ou de funcionalidades essenciais;
- danos à reputação do projeto ou da instituição envolvida;
- impactos legais e regulatórios, considerando a natureza sensível dos dados de saúde (incluindo exigências da LGPD).

| Valor | Classificação | Critério                                                                                                                                                             |
| ----- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Baixo         | Consequências limitadas, sem exposição de dados sensíveis e sem efeito perceptível para os usuários.                                                                 |
| 2     | Moderado      | Consequências perceptíveis, podendo envolver indisponibilidade parcial ou exposição restrita de informações não críticas.                                            |
| 3     | Alto          | Consequências significativas, com possível exposição de dados sensíveis, prejuízo direto aos usuários ou indisponibilidade relevante.                                |
| 4     | Muito alto    | Consequências graves, com exposição de dados médicos sensíveis em larga escala, comprometimento da confiança no sistema e possíveis implicações legais/regulatórias. |

---

## 3. Cálculo e Classificação dos Riscos

A pontuação de risco é obtida pela multiplicação entre probabilidade e impacto:

**Risco = Probabilidade × Impacto**

O resultado é enquadrado em uma faixa de classificação:

| Pontuação | Classificação |
| --------- | ------------- |
| 1 a 3     | Baixo         |
| 4 a 7     | Médio         |
| 8 a 11    | Alto          |
| 12 a 16   | Crítico       |

A pontuação apoia a **priorização** dos riscos, direcionando os esforços de mitigação primeiro às ameaças mais críticas. O valor numérico, porém, não deve ser interpretado isoladamente: o contexto específico de cada risco — criticidade do ativo envolvido, sensibilidade dos dados médicos afetados e circunstâncias de uso do sistema — deve ser considerado junto à pontuação na tomada de decisão.

> **Observação:** como probabilidade e impacto variam de 1 a 4, alguns valores dentro das faixas (5, 7, 10 e 11) não são matematicamente alcançáveis pela multiplicação. As faixas são mantidas contínuas apenas para padronizar a leitura da classificação.

---

## 4. Modelo de Risco Residual

Risco residual é o nível de risco que permanece **após** a aplicação de um ou mais controles de segurança. Parte-se do princípio de que nenhum controle elimina totalmente um risco: uma medida de mitigação reduz a probabilidade e/ou o impacto de uma ameaça, mas não necessariamente a anula por completo.

A avaliação do risco residual seguirá a mesma lógica de cálculo da seção anterior (probabilidade × impacto), aplicada à condição esperada após a implementação do controle. O modelo de registro a ser utilizado é:

| Risco   | Nível inicial                              | Controle aplicado                         | Nível residual esperado                   | Condição para aceite                                     |
| ------- | ------------------------------------------ | ----------------------------------------- | ----------------------------------------- | -------------------------------------------------------- |
| R01–R15 | Conforme o registro consolidado da Etapa 2 | Conforme o plano de tratamento da Etapa 2 | Conforme a estimativa residual registrada | Implementação, teste bem-sucedido e evidência versionada |

Pontos importantes sobre o modelo:

- o nível residual esperado é uma **estimativa**, definida com base na eficácia teórica do controle proposto;
- a estimativa não substitui a verificação prática: o nível residual real precisa ser **confirmado posteriormente por meio de testes, evidências técnicas ou validação em ambiente controlado**;
- a condição para aceite descreve o que precisa ser verdadeiro (por exemplo, ausência de determinada vulnerabilidade após teste, ou existência de determinada evidência de controle) para que o risco residual seja considerado aceitável pela equipe;
- caso o risco residual estimado permaneça acima do nível aceitável definido pelo grupo, controles adicionais devem ser avaliados.

Os riscos específicos R01–R15, os controles propostos e as estimativas residuais estão registrados em `etapa2-riscos-e-tratamento.md`. Este documento permanece como referência metodológica para o cálculo e a classificação.

---

## 5. Relação com o NIST CSF 2.0

Os critérios de probabilidade, impacto e risco residual servirão de base metodológica para as etapas seguintes de tratamento, nas quais os riscos identificados serão relacionados às funções do NIST Cybersecurity Framework (CSF) 2.0:

- **Govern (Governar):** os critérios padronizam como os riscos são avaliados e priorizados, apoiando decisões de governança sobre quais riscos aceitar, mitigar ou monitorar.
- **Identify (Identificar):** a classificação de probabilidade e impacto complementa a identificação de ameaças e vulnerabilidades já realizada na modelagem STRIDE.
- **Protect (Proteger):** a priorização por nível de risco orienta quais controles de proteção devem ser implementados primeiro.
- **Detect (Detectar):** riscos com maior probabilidade tendem a exigir mecanismos de detecção mais robustos, já que sua ocorrência é mais provável.
- **Respond (Responder):** o nível de impacto ajuda a definir a proporcionalidade da resposta necessária caso o risco se concretize.
- **Recover (Recuperar):** riscos classificados como críticos ou altos indicam a necessidade de planos de recuperação mais bem definidos.

O detalhamento dos controles e o mapeamento formal entre R01–R15 e as funções do NIST CSF 2.0 estão consolidados na [matriz NIST e priorização de controles](matriz-nist-e-priorizacao-controles.md). Os valores residuais permanecem estimativas enquanto as condições de aceite não forem integralmente verificadas.
