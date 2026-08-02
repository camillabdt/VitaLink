# AGENTS.md

Instruções específicas para agentes que trabalham no projeto VitaLink. As instruções globais do ambiente continuam válidas.

## Contexto e prioridades

- O VitaLink é um projeto acadêmico da disciplina de Engenharia de Software Seguro.
- A documentação solicitada em `dev-docs/Enunciado.md` é a prioridade atual e o principal objeto de avaliação.
- Antes de trabalhar em qualquer issue, releia `dev-docs/Enunciado.md` e confira os artefatos relacionados.
- Trate `dev-docs/Enunciado.md` como fonte dos requisitos da disciplina e `README.md` como apresentação pública atual do projeto.
- O MVP será implementado somente após a documentação correspondente e deverá refletir as decisões de segurança registradas nela.
- Não antecipe funcionalidades, arquitetura ou dependências do MVP sem uma issue e uma necessidade documentada.

## Idioma

- Escreva documentação, issues, pull requests, commits e explicações em PT-BR.
- Use EN-US apenas em código, identificadores, comentários de código e elementos internos de configuração que exijam inglês.
- Mantenha os termos técnicos consistentes entre texto, tabelas, diagramas e código.

## Fluxo de trabalho por issue

1. Leia novamente o enunciado e identifique os critérios aplicáveis à issue.
2. Atualize a branch `develop` e crie uma branch exclusiva a partir dela.
3. Nomeie a branch com o nome da issue em `kebab-case`, sem espaços ou acentos. Inclua o número quando disponível, por exemplo, `12-modelagem-de-ameacas`.
4. Faça apenas as alterações necessárias para concluir a issue.
5. Verifique o resultado com o menor teste ou check relevante.
6. Abra um pull request da branch da issue para `develop`.

Não trabalhe diretamente em `main` ou `develop`. Use `develop` como branch principal de desenvolvimento e reserve `main` para versões estáveis.

## Git e autoria

- Todos os commits devem ser atribuídos à conta GitHub `amandadiasdev`.
- Antes de commitar, confirme que `user.name` e `user.email` locais pertencem a essa conta. Se a identidade estiver ausente ou divergente, pare e peça confirmação. Não altere a configuração global do Git.
- Use Conventional Commits com descrição clara em PT-BR, por exemplo, `feat: adiciona autenticação de dois fatores`.
- Explique no corpo do commit o motivo da alteração quando ele não estiver evidente no título.
- Não crie commits artificiais nem atribua a uma integrante o trabalho feito por outra. O histórico deve refletir a contribuição real de cada pessoa.
- Antes de commitar, revise o diff e os arquivos preparados. Não inclua arquivos temporários, configurações locais, segredos, caches, ambientes virtuais ou artefatos de build.

## Documentação e análise de segurança

- Preserve as etapas anteriores ao adicionar uma nova etapa. Corrija inconsistências de forma explícita e rastreável.
- Use identificadores estáveis, como `T01` para ameaças, `CA01` para casos de abuso e `R01` para riscos.
- Mantenha a rastreabilidade entre ameaças STRIDE, casos de abuso, riscos, controles e funções do NIST CSF 2.0.
- Use as escalas, fórmulas e classificações definidas no enunciado. Justifique probabilidade, impacto, prioridade e risco residual.
- Diferencie ameaça, vulnerabilidade, ataque, risco, função do NIST, resultado esperado e controle.
- Trate prontuários, documentos médicos, credenciais, autorizações e logs de acesso como ativos sensíveis.
- Apresente risco residual como estimativa até que os controles tenham sido implementados e verificados.
- A estrutura sugerida pelo professor é uma referência, não uma obrigação. Altere-a somente quando a nova organização tornar o conteúdo mais claro e fácil de avaliar.
- Mantenha no repositório as fontes editáveis dos diagramas e suas exportações legíveis.

## Desenvolvimento do MVP

- Desenvolva toda nova funcionalidade com TDD, uma pequena fatia vertical por vez: escreva um teste comportamental que falhe, implemente o mínimo para fazê-lo passar e só então refatore.
- Teste pela interface pública e não simule colaboradores internos. Simule apenas limites externos quando necessário.
- Use Python 3.12 ou superior, `uv` e as configurações existentes em `pyproject.toml`, salvo decisão posterior documentada.
- Validação de entrada, autorização, proteção de dados sensíveis, registros de auditoria e tratamento seguro de erros não podem ser simplificados.

## Verificação

- Em documentação, confira estrutura Markdown, links, tabelas, identificadores, referências cruzadas e coerência com o enunciado.
- Recalcule as pontuações de risco e confirme a classificação de cada resultado.
- Após editar Markdown, execute Prettier quando disponível. Se não estiver disponível, revise o diff manualmente.
- Em código, execute primeiro o teste relacionado à mudança e depois os checks mais amplos necessários, incluindo Ruff quando configurado.
- Informe claramente verificações não executadas, aproximações e incertezas restantes.
