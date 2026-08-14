# Enunciado do Trabalho

## Sumário

- [Orientações gerais](#orientações-gerais)
- [Etapa 1: Casos de Abuso e Modelagem de Ameaças com STRIDE](#etapa-1--casos-de-abuso-e-modelagem-de-ameaças-com-stride)
- [Etapa 2: Análise, Priorização e Tratamento de Riscos com o NIST CSF](#etapa-2--análise-priorização-e-tratamento-de-riscos-com-o-nist-csf)

## Orientações gerais

As orientações desta seção são válidas para todas as etapas do trabalho. O mesmo sistema e o mesmo repositório deverão ser utilizados durante toda a disciplina, permitindo acompanhar a evolução da análise e das decisões de segurança.

### 1. Repositório do grupo

O trabalho deverá ser desenvolvido em um repositório no GitHub criado especificamente para o grupo.

O documento principal deverá ser escrito em Markdown e poderá ser disponibilizado no arquivo README.md ou em outro arquivo claramente identificado, como:

`docs/modelagem-de-ameacas.md`

Todos os arquivos produzidos para o trabalho deverão ser versionados no mesmo repositório, incluindo:

- documentos em Markdown;
- imagens;
- diagramas;
- arquivos-fonte dos diagramas;
- tabelas ou materiais complementares.

Não deverão ser enviados apenas links para diagramas armazenados em ferramentas externas. Os arquivos utilizados no trabalho também deverão estar disponíveis no repositório.

### 2. Participação individual e uso de commits

Embora o trabalho seja realizado em grupo, a avaliação será individual.

Todos os integrantes deverão demonstrar sua participação por meio de commits próprios no repositório.

Cada estudante deverá contribuir efetivamente para a construção do trabalho, realizando atividades como:

- escrita ou revisão de seções;
- identificação de ameaças;
- elaboração de casos de abuso;
- criação de diagramas;
- organização do repositório;
- correção e evolução do documento.

Não será suficiente que apenas uma pessoa realize todos os commits em nome do grupo.

Commits deverão possuir mensagens que permitam compreender a contribuição realizada. Evitem mensagens genéricas como:

- alterações
- ajustes
- trabalho

Prefiram mensagens como:

- Adiciona ameaças de falsificação de identidade
- Descreve ativos e dados sensíveis do sistema
- Inclui caso de abuso de alteração de pagamento
- Atualiza diagrama de fluxo de dados

A quantidade de commits, isoladamente, não determinará a nota. Serão consideradas a relevância, a consistência e a evolução das contribuições de cada integrante.

Commits artificiais, alterações sem conteúdo relevante ou divisão proposital de uma pequena alteração em muitos commits não serão considerados como participação efetiva.

### 3. Organização recomendada do repositório

Uma possível estrutura é apresentada a seguir:

```text
nome-do-projeto/
├── README.md
├── docs/
│   └── modelagem-de-ameacas.md
├── diagramas/
│   ├── diagrama-contexto.png
│   ├── diagrama-contexto.drawio
│   └── casos-de-abuso.png
└── imagens/
```

Essa estrutura é apenas uma recomendação. O grupo poderá adotar outra organização, desde que os arquivos estejam claramente identificados.

### 4. Orientação sobre o GitHub

Em breve será disponibilizado um vídeo explicando como criar e organizar o projeto no GitHub, incluindo orientações para estudantes que ainda não possuem experiência prévia com:

- criação de repositórios;
- clonagem do projeto;
- criação e edição de arquivos Markdown;
- commits;
- envio das alterações para o GitHub;
- colaboração entre os integrantes do grupo.

A falta de experiência anterior com Git ou GitHub não será um impedimento para a realização do trabalho. Procure o professor sempre que necessário. A disciplina também conta com dois mestrandos estagiários que estão disponíveis para apoiá-los. O vídeo apresentará os procedimentos necessários para iniciar o projeto.

### 5. Entrega

A entrega será realizada por meio do endereço do repositório do grupo; você já pode entregar o repositório assim que o criar; você poderá atualizá-lo a qualquer momento; o repositório será avaliado apenas no final da disciplina, pois este trabalho é composto de várias etapas.

O repositório deverá estar acessível ao professor até a data definida para a entrega (recomendo disponibilizar o mais breve possível, após a atividade estar aberta para o envio). O vídeo final, sumarizando tudo o que foi feito, pode ser enviado ao final da disciplina. Alterações realizadas após o prazo poderão ser desconsideradas para fins de avaliação.

Todos os integrantes deverão verificar se seus commits estão corretamente associados às suas próprias contas do GitHub.

## Etapa 1 — Casos de Abuso e Modelagem de Ameaças com STRIDE

### 6. Objetivo

O objetivo desta etapa é iniciar a análise de segurança de um sistema de software antes da implementação, identificando possíveis comportamentos maliciosos, ameaças e impactos relacionados ao funcionamento da aplicação.

Cada grupo deverá escolher um sistema de software e produzir, no repositório do grupo no GitHub, um documento em Markdown contendo:

- uma breve descrição do sistema;
- a identificação dos principais usuários, recursos e informações protegidas;
- a modelagem de ameaças utilizando o STRIDE;
- a definição de casos de abuso;
- opcionalmente, diagramas que auxiliem na compreensão do sistema e das ameaças identificadas.

### 7. Escolha do sistema

O grupo deverá escolher um sistema que possua diferentes tipos de usuários, troca de informações e operações relevantes para a segurança.

Exemplos:

- aplicativo de delivery;
- aplicativo de transporte ou corridas;
- sistema de agendamento de consultas;
- plataforma de comércio eletrônico;
- sistema bancário;
- sistema acadêmico;
- aplicativo de hospedagem;
- rede social;
- plataforma de contratação de serviços;
- sistema de compartilhamento de arquivos.

O grupo também poderá propor outro tipo de software, desde que o sistema escolhido permita a identificação de diferentes ameaças e casos de abuso.

Não será necessário implementar o software. O foco deste trabalho é compreender o funcionamento do sistema e analisar os possíveis problemas de segurança.

### 8. Estrutura mínima do documento

O documento deverá conter, no mínimo, as seções apresentadas a seguir.

#### 8.1 Identificação do sistema

Apresentar:

- nome do sistema;
- integrantes do grupo;
- endereço do repositório;
- breve justificativa para a escolha do sistema.

#### 8.2 Descrição do sistema

Descrever brevemente o funcionamento do software.

A descrição deverá permitir que uma pessoa que não conhece o sistema compreenda:

- qual problema o sistema resolve;
- quem utiliza o sistema;
- quais são as principais funcionalidades;
- quais informações são armazenadas ou transmitidas;
- quais recursos precisam ser protegidos.

Não é necessário apresentar uma especificação completa de requisitos. Entretanto, a descrição deve ser suficientemente clara para sustentar a análise de segurança.

#### 8.3 Usuários, ativos e pontos de interação

Identificar os principais elementos envolvidos no sistema, como:

- usuários e perfis de acesso;
- dados pessoais ou sensíveis;
- credenciais;
- pagamentos;
- avaliações;
- mensagens;
- localização;
- documentos;
- banco de dados;
- servidores;
- APIs;
- aplicativos móveis;
- serviços externos.

O grupo deverá destacar quais desses elementos são considerados ativos importantes, isto é, recursos que podem causar prejuízos caso sejam acessados, alterados, destruídos ou indisponibilizados indevidamente.

#### 8.4 Visão geral da arquitetura ou fluxo

Apresentar uma visão simplificada de como os usuários e componentes interagem.

Essa visão poderá ser apresentada por meio de texto, tabela ou diagrama.

Preferencialmente, o grupo poderá elaborar um ou mais diagramas, como:

- diagrama de contexto;
- diagrama de fluxo de dados;
- diagrama simplificado de componentes;
- diagrama de casos de uso;
- representação dos usuários, serviços e bancos de dados.

Os diagramas deverão estar legíveis e ser versionados no repositório do grupo. Caso você não conheça esses diagramas, não se preocupe; são apenas sugestões. Pode usar o formato textual apenas se preferir.

#### 8.5 Modelagem de ameaças com STRIDE

O grupo deverá aplicar o STRIDE ao sistema escolhido.

Para cada categoria, deverão ser identificadas ameaças que façam sentido no contexto do sistema:

- Spoofing: falsificação de identidade;
- Tampering: alteração indevida de dados;
- Repudiation: possibilidade de negar uma ação realizada;
- Information Disclosure: exposição indevida de informações;
- Denial of Service: indisponibilidade ou degradação do serviço;
- Elevation of Privilege: obtenção indevida de permissões.

A análise deverá apresentar ameaças concretas e relacionadas ao funcionamento do software escolhido. Não basta apenas definir cada categoria do STRIDE.

Sugere-se organizar a análise em uma tabela semelhante à seguinte:

| ID  | Categoria STRIDE       | Componente ou ativo | Ameaça identificada                                                           | Possível impacto                                                     |
| --- | ---------------------- | ------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| T01 | Spoofing               | Conta do usuário    | Um atacante utiliza credenciais roubadas para acessar a conta de outra pessoa | Acesso a informações privadas e realização de operações fraudulentas |
| T02 | Tampering              | Pedido              | Um usuário altera o valor de um pedido antes do pagamento                     | Prejuízo financeiro                                                  |
| T03 | Information Disclosure | Banco de dados      | Informações pessoais são expostas por uma falha de autorização                | Violação de privacidade                                              |

O número de ameaças dependerá da complexidade do sistema. Entretanto, espera-se que o grupo analise todas as categorias do STRIDE e justifique quando alguma delas não for aplicável.

#### 8.6 Casos de abuso

Os casos de abuso deverão representar formas pelas quais uma pessoa mal-intencionada, um usuário indevido ou até mesmo um usuário legítimo poderia utilizar o sistema para causar danos.

Cada caso de abuso deverá conter:

- identificador;
- título;
- ator malicioso ou agente envolvido;
- objetivo do abuso;
- condições necessárias;
- sequência de ações;
- impacto esperado;
- relação com uma ou mais categorias do STRIDE.

Exemplo:

##### CA01 — Cadastro de falso profissional

**Ator:** usuário mal-intencionado.

**Objetivo:** obter acesso a informações privadas de clientes.

**Condições:** o sistema permite o cadastro de profissionais sem verificar adequadamente sua identidade ou habilitação.

**Fluxo de abuso:**

- O atacante cria uma conta como profissional.
- O sistema aceita o cadastro sem validação suficiente.
- O atacante recebe solicitações contendo informações privadas.
- O atacante acessa ou armazena os dados das vítimas.

**Impacto:** exposição de informações pessoais ou sensíveis, fraude e perda de confiança no sistema.

**Categorias STRIDE relacionadas:** Spoofing, Information Disclosure e Elevation of Privilege.

Os casos de abuso também poderão ser representados por diagramas, desde que sejam acompanhados por uma explicação textual.

#### 8.7 Considerações finais

Apresentar uma síntese contendo:

- as ameaças consideradas mais preocupantes;
- os ativos mais importantes do sistema;
- os tipos de abuso que poderiam causar maior impacto;
- as principais dificuldades encontradas pelo grupo durante a análise.

Não é obrigatório, neste primeiro trabalho, propor uma solução completa para todas as ameaças. Entretanto, o grupo poderá indicar possíveis medidas de proteção quando considerar pertinente.

### 9. Critérios de avaliação

Serão considerados:

- clareza e qualidade da descrição do sistema;
- identificação adequada de usuários, ativos e componentes;
- aplicação correta e contextualizada do STRIDE;
- qualidade e coerência das ameaças identificadas;
- qualidade dos casos de abuso;
- relação entre os casos de abuso e as ameaças;
- organização e legibilidade do documento em Markdown;
- qualidade dos diagramas, quando utilizados;
- organização do repositório;
- histórico de evolução do trabalho;
- participação individual demonstrada por meio dos commits.

## Etapa 2 — Análise, Priorização e Tratamento de Riscos com o NIST CSF

### 10. Objetivo

O objetivo desta etapa é continuar a análise iniciada na Etapa 1, transformando as ameaças e os casos de abuso identificados em riscos que possam ser avaliados, comparados, priorizados e tratados.

O grupo deverá:

- definir critérios de probabilidade e impacto;
- transformar as ameaças da Etapa 1 em eventos de risco;
- calcular e justificar o nível de cada risco;
- definir uma ordem de prioridade;
- escolher estratégias de tratamento;
- relacionar os riscos às funções do NIST Cybersecurity Framework 2.0;
- propor controles concretos;
- indicar responsáveis e formas de verificação;
- estimar o risco residual esperado.

Nesta etapa, não será necessário implementar os controles. O objetivo é elaborar um plano de tratamento coerente com o sistema analisado e com os riscos anteriormente identificados.

### 11. Continuidade do projeto

O grupo deverá utilizar:

- o mesmo sistema escolhido na Etapa 1;
- o mesmo repositório do GitHub;
- as mesmas ameaças STRIDE;
- os mesmos casos de abuso;
- os ativos, usuários e componentes já descritos.

A Etapa 2 deverá ser adicionada ao documento existente. O conteúdo da Etapa 1 não deverá ser substituído ou apagado.

Caso o grupo perceba algum problema na análise anterior, poderá corrigi-lo por meio de novos commits. A alteração deverá ser explicada e deverá manter a coerência entre ameaças, casos de abuso, riscos e controles.

### 12. Estrutura mínima da Etapa 2

O documento deverá conter, no mínimo:

- critérios de probabilidade;
- critérios de impacto;
- cálculo e classificação dos riscos;
- registro de riscos;
- justificativa das avaliações;
- priorização dos riscos;
- estratégias de tratamento;
- apresentação das funções do NIST CSF 2.0;
- mapeamento dos riscos para as funções do NIST;
- plano de tratamento;
- ordem inicial de implementação;
- estimativa do risco residual;
- considerações finais.

### 13. Análise e priorização dos riscos

#### 13.1 Critérios de probabilidade

O grupo deverá utilizar a seguinte escala:

| Valor | Classificação | Critério                                                                                     |
| ----: | ------------- | -------------------------------------------------------------------------------------------- |
|     1 | Baixa         | O evento depende de condições incomuns, acesso muito específico ou grande capacidade técnica |
|     2 | Média-baixa   | O evento é possível, mas depende de uma vulnerabilidade ou condição específica               |
|     3 | Média-alta    | O evento é plausível e pode ocorrer em situações comuns de uso ou ataque                     |
|     4 | Alta          | O evento pode ocorrer com facilidade, frequência ou durante condições previsíveis do sistema |

A probabilidade não deverá ser escolhida apenas por intuição. Cada valor deverá ser justificado com base nas características do sistema, nos usuários, nas vulnerabilidades, nas condições de exploração e no contexto de uso.

#### 13.2 Critérios de impacto

O grupo deverá utilizar a seguinte escala:

| Valor | Classificação | Critério                                                                             |
| ----: | ------------- | ------------------------------------------------------------------------------------ |
|     1 | Baixo         | Causa pequeno transtorno e pode ser corrigido rapidamente                            |
|     2 | Moderado      | Causa interrupção ou inconsistência limitada, com possibilidade de recuperação       |
|     3 | Alto          | Causa prejuízo relevante aos usuários, ao negócio, à administração ou à privacidade  |
|     4 | Muito alto    | Pode afetar muitos usuários, comprometer operações críticas ou causar prejuízo grave |

Na avaliação do impacto, o grupo poderá considerar, conforme o sistema escolhido:

- prejuízos aos usuários;
- exposição de dados;
- perdas financeiras;
- interrupção do serviço;
- comprometimento de operações importantes;
- danos jurídicos ou regulatórios;
- danos à reputação;
- dificuldade de recuperação;
- quantidade de pessoas afetadas.

#### 13.3 Cálculo e classificação

A pontuação deverá ser calculada da seguinte forma:

> **Pontuação = Probabilidade × Impacto**

O resultado deverá ser classificado conforme a tabela:

| Pontuação | Nível do risco |
| --------: | -------------- |
|     1 a 3 | Baixo          |
|     4 a 7 | Médio          |
|    8 a 11 | Alto           |
|   12 a 16 | Crítico        |

A pontuação auxilia na comparação dos riscos, mas não substitui a análise do contexto. Dois riscos com a mesma pontuação podem receber prioridades diferentes quando suas consequências, dependências ou possibilidades de recuperação forem distintas.

#### 13.4 Registro de riscos

Cada ameaça relevante da Etapa 1 deverá originar pelo menos um risco. Quando uma ameaça puder causar consequências diferentes, o grupo poderá criar mais de um risco relacionado a ela.

O registro deverá conter:

| Campo                       | Descrição                                           |
| --------------------------- | --------------------------------------------------- |
| ID                          | Identificador único, como R01, R02 e R03            |
| Origem STRIDE               | Categoria ou ameaça da Etapa 1 relacionada ao risco |
| Evento de risco             | Situação que poderá ocorrer e causar prejuízo       |
| Vulnerabilidade ou condição | Fraqueza ou circunstância que permite o evento      |
| Probabilidade               | Valor de 1 a 4                                      |
| Impacto                     | Valor de 1 a 4                                      |
| Pontuação                   | Resultado da multiplicação                          |
| Nível                       | Baixo, médio, alto ou crítico                       |

Sugere-se utilizar uma tabela semelhante à seguinte:

| ID  | Origem STRIDE | Evento de risco                                                          | Vulnerabilidade ou condição                                   | Probabilidade | Impacto | Pontuação | Nível   |
| --- | ------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------: | ------: | --------: | ------- |
| R01 | Spoofing      | Um atacante acessa a conta de um usuário e realiza operações em seu nome | Credenciais comprometidas e ausência de verificação adicional |             3 |       4 |        12 | Crítico |

O exemplo serve apenas para demonstrar a estrutura. Os riscos deverão ser elaborados especificamente para o sistema escolhido pelo grupo.

#### 13.5 Justificativas

Para cada risco, o grupo deverá explicar:

- por que a probabilidade recebeu aquele valor;
- por que o impacto recebeu aquele valor;
- quais usuários, dados, funcionalidades ou componentes podem ser afetados;
- quais consequências podem ocorrer;
- por que o nível calculado representa adequadamente o contexto analisado.

Não será suficiente apresentar apenas os números.

#### 13.6 Priorização

Depois da classificação, o grupo deverá apresentar uma ordem inicial de prioridade.

A priorização deverá considerar:

- a pontuação;
- a gravidade das consequências;
- a quantidade de usuários afetados;
- a importância do ativo;
- a possibilidade de recuperação;
- as dependências entre os riscos;
- a urgência do tratamento.

O grupo deverá explicar por que um risco deve ser tratado antes dos demais.

### 14. Tratamento dos riscos

#### 14.1 Estratégias de tratamento

Para cada risco, o grupo deverá escolher uma estratégia principal:

| Estratégia   | Descrição                                                                       |
| ------------ | ------------------------------------------------------------------------------- |
| Evitar       | Eliminar a atividade ou condição que dá origem ao risco                         |
| Reduzir      | Implementar medidas para diminuir sua probabilidade ou seu impacto              |
| Compartilhar | Atribuir parte da operação ou das consequências a um terceiro                   |
| Aceitar      | Reconhecer e manter conscientemente o risco, com justificativa e acompanhamento |

A escolha deverá ser justificada.

Aceitar um risco não significa ignorá-lo. A aceitação deverá indicar:

- o motivo da decisão;
- quem deverá aprová-la;
- em quais condições o risco será aceito;
- quando a decisão deverá ser revisada.

#### 14.2 Funções do NIST CSF 2.0

O grupo deverá utilizar as seis funções do NIST Cybersecurity Framework 2.0 para organizar os resultados de segurança esperados:

| Função   | Finalidade                                                               |
| -------- | ------------------------------------------------------------------------ |
| Govern   | Definir políticas, responsabilidades, prioridades e critérios de decisão |
| Identify | Conhecer ativos, dependências, vulnerabilidades e riscos                 |
| Protect  | Implementar salvaguardas para reduzir a probabilidade ou o impacto       |
| Detect   | Identificar eventos suspeitos, falhas e possíveis incidentes             |
| Respond  | Conter, analisar, comunicar e tratar incidentes                          |
| Recover  | Restaurar serviços e dados e reduzir os prejuízos causados               |

As funções do NIST não são controles específicos.

Por exemplo:

- Protect é uma função;
- proteger o acesso às contas é um resultado esperado;
- autenticação multifator é um possível controle.

Não será suficiente escrever apenas “aplicar o NIST” ou listar as funções sem relacioná-las aos riscos do sistema.

#### 14.3 Mapeamento dos riscos para o NIST CSF

O grupo deverá indicar quais funções são relevantes para cada risco.

Sugere-se utilizar uma tabela como:

| Risco | Govern | Identify | Protect | Detect | Respond | Recover |
| ----- | ------ | -------- | ------- | ------ | ------- | ------- |
| R01   | X      | X        | X       | X      | X       | X       |

Um risco poderá estar relacionado a várias funções. Entretanto, o grupo deverá analisar cada relação, evitando marcar todas as funções automaticamente.

#### 14.4 Plano de tratamento

Para cada risco, o grupo deverá elaborar um plano contendo:

| Campo                    | Descrição                                                |
| ------------------------ | -------------------------------------------------------- |
| Risco                    | Identificador e título                                   |
| Estratégia               | Evitar, reduzir, compartilhar ou aceitar                 |
| Controles propostos      | Medidas concretas para tratar o risco                    |
| Funções do NIST          | Funções relacionadas aos controles                       |
| Responsáveis             | Pessoas, equipes ou setores responsáveis                 |
| Evidências e verificação | Formas de confirmar que os controles existem e funcionam |

Sugere-se utilizar uma tabela como:

| Risco | Estratégia | Controles propostos                                                       | Funções relacionadas               | Responsáveis                     | Evidências e verificação                                      |
| ----- | ---------- | ------------------------------------------------------------------------- | ---------------------------------- | -------------------------------- | ------------------------------------------------------------- |
| R01   | Reduzir    | Autenticação multifator; confirmação de operações sensíveis; notificações | Protect, Detect, Respond e Recover | Desenvolvimento e infraestrutura | Testes de autenticação; logs; simulação de conta comprometida |

Os controles deverão ser específicos e observáveis.

Evitem propostas genéricas como:

- aumentar a segurança;
- usar criptografia;
- melhorar a autenticação;
- utilizar o NIST;
- monitorar o sistema.

Quando uma dessas ideias for utilizada, o grupo deverá explicar:

- onde será aplicada;
- qual problema pretende reduzir;
- como deverá funcionar;
- quem será responsável;
- como será verificada.

#### 14.5 Ordem inicial de implementação

O grupo deverá definir uma ordem inicial para a implementação dos controles.

A ordem poderá considerar:

- riscos críticos e altos;
- dependências técnicas;
- controles que reduzem vários riscos;
- custo e complexidade;
- recursos disponíveis;
- necessidade de políticas ou decisões anteriores;
- urgência.

A ordem deverá ser justificada e poderá ser revisada nas próximas etapas.

#### 14.6 Estimativa do risco residual

O grupo deverá estimar o nível esperado de cada risco após a implementação dos controles.

A tabela deverá conter:

| Risco | Nível inicial | Nível residual esperado | Condição para aceitar o residual |
| ----- | ------------- | ----------------------- | -------------------------------- |

O risco residual deverá ser apresentado como uma estimativa.

O grupo não poderá afirmar que o risco já foi reduzido apenas porque um controle foi proposto. A redução somente poderá ser confirmada após implementação, testes e obtenção de evidências.

### 15. Considerações finais

A conclusão deverá apresentar:

- os riscos considerados mais importantes;
- as razões que determinaram a priorização;
- as estratégias de tratamento predominantes;
- as funções do NIST mais relevantes para o sistema;
- os controles considerados essenciais;
- as principais dificuldades encontradas;
- as limitações da avaliação;
- os pontos que precisarão ser detalhados nas próximas etapas.

### 16. Critérios de avaliação da Etapa 2

Serão considerados:

- continuidade e coerência com a Etapa 1;
- definição clara dos critérios de probabilidade e impacto;
- correção dos cálculos;
- qualidade das justificativas;
- coerência da priorização;
- diferenciação correta entre ameaça, vulnerabilidade, ataque e risco;
- adequação das estratégias de tratamento;
- aplicação contextualizada das funções do NIST CSF;
- diferenciação entre função, resultado esperado e controle;
- qualidade e especificidade dos controles propostos;
- definição de responsáveis;
- qualidade das evidências e formas de verificação;
- coerência da ordem de implementação;
- realismo da estimativa do risco residual;
- organização e legibilidade do documento;
- evolução do trabalho demonstrada por commits;
- participação individual dos integrantes.
