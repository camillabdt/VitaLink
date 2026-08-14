## AULA 14: SEU SISTEMA SOBREVIVERIA A UM PICO DE ACESSOS — OU VIRARIA UM CAOS?

### TRANSCRIÇÃO DA AULA

Imagina que na hora que você mais precisa que o sistema esteja funcionando ele acaba caindo Nos exemplos que nós estávamos conversando nos vídeos anteriores onde nós usamos um sistema de matrículas esse sistema ele é bastante suscetível a esse tipo de problema E o pior é que momento mais importante para o sistema de matrículas é justamente o período de matrículas que é quando os usuários mais procuram mais acessam ao sistema para renovar as suas matrículas e se manterem vinculados à instituição no início de cada semestre Uma disponibilidade nesse momento pode acabar impedindo solicitações legítimas de solicitação de matrícula pode acabar gerando desigualdade pode acabar gerando perda de prazos pode aumentar ainda a sobrecarga para a secretaria acadêmica que depois tem que tentar resolver esses problemas de usuários que não estão matriculados porque não conseguiram se matricular pode.

acabar produzindo múltiplas tentativas de matrículas eventualmente até mesmo redundante e pode também assim como o total dessas ações pode acabar comprometendo a confiança no processo de matrícula.

Então e é bastante comum que quando abre o período de matrícula todos os usuários ou pelo menos muitos deles tentem fazer simultaneamente a sua matrícula.

Então é justamente no momento que mais precisa funcionar que a maior sobrecarga acontece e que pode acabar ocasionando portanto a indisponibilidade.

Então quando você faz uma arquitetura para que ela seja segura mesmo você deve considerar dimensionamento você deve trabalhar com filas você deve também ter cash de consultas para evitar sobrecarga você pode limitar requisições você pode pensar em processamento assíncrono sempre que for possível ou seja não precisa criar um status bloqueante onde uma operação precisa ser finalizada para que a outra comece Você pode criar uma fila de operações que conforme a demanda e conforme o disponibilidade de recursos do computador ou do servidor elas sejam processadas uma depois da outra Você pode também contar com redundância por que não ligar os servidores para mais aí justamente no momento de matrícula que é onde é esperado um tráfego a maior você deve também continuar de forma contínua o fazendo um monitoramento especialmente nesse momento do período de matrículas.

Então você pode estar com um dashboard por exemplo administrativo cuidando as solicitações e verificando se o sistema está usando por exemplo muitos recursos comparacionais se na hora de levantar uma outra instância caso você use virtualização por exemplo E também você deve ter um plano de recuperação O que acontece se o sistema cair Tem como levantar rapidinho em uma máquina Eu posso já deixar algumas máquinas prontas para assumirem o papel daquela ali caso ela caia algum balanceamento de carga.

Então isso tudo vai me ajudar a ter uma degradação mais controlada Por mais que haja aquela sobrecarga e muitas pessoas muitos alunos disputando aquela vaga naquele momento de se matricular eu tenho uma degradação mais controlada Eu consigo lidar com essa demanda e com isso eu consigo então separar operações eu consigo fazer com que a consulta de oferta seja bastante cacheável O que que cacheável Eu posso armazenar essa consulta para que pessoas que façam essa nova consulta consigam ter o dado ali de maneira mais pronta sem precisar ter um processamento muito extenso para que essa informação seja recuperada porque já sabemos que muitas pessoas recuperarão a mesma informação então eu posso trabalhar com cash A confirmação de matrícula portanto ela não tem esse mesmo tipo de facilidade porque cada matrícula vai ser única ela vai existir vai exigir bastante consistência vai exigir exigir.

também uma validação atualizada então eu não consigo fazer cash da confirmação da matrícula mas quando eu tô consultando o horário eu consigo.

Então esse tipo de exercício de verificar que tipo de tarefa que requer um processamento maior que requer uma consulta atualizada que eu preciso verificar pera aí ainda tem vaga.

Então isso eu tenho que fazer o tempo todo É diferente de olhar qual horário vai ser a disciplina Qual horário vai ser o mesmo Não vai mudar esse horário o tempo todo Durante o período de matrícula não deve mudar o horário.

Então eu posso trabalhar com cash a informação tem que ser atualizada.

Por exemplo quantas vagas ainda tem então nesse momento eu tenho que fazer uma requisição diferente e que garanta a atualização.

Então eu não posso tratar todas as requisições da mesma maneira Isso é bastante importante Eu posso também estar suscetível a uso de bots.

Por exemplo alunos podem criar uma automação que não deve especialmente alunos de computação que já sabe mexer com essas coisas pode criar um scriptinho ali que tenta consultar vagas ou enviar várias solicitações repetidas.

Então esse tipo de coisa pode acontecer dependendo das regras isso pode acabar sobrecarregando o meu sistema pode gerar uma vantagem injusta pode consumir recursos o sistema pode produzir spam de notificações prejudicar outras pessoas.

Então o que que eu posso fazer quanto a isso Sabendo que isso pode acontecer Alguns controles possíveis são rate limit que é limitar a taxa de acesso por exemplo por usuário Eu posso adicionar capturas eu posso ter cotas por identidade Você tem um tempo que pode usar o sistema depois você vai ser desligado do sistema vai inspirar sua sessão por exemplo Eu posso criar filas.

Então se você acessou e tem muito usuário você vai ficar numa fila e depois que inspirar seu tempo você vai pro final da fila Eu posso limitar o número de tentativas que você pode tentar fazer requisições.

Então se um usuário maintenutário fizer várias requisições ele vai ser bloqueado Eu posso detectar padrões também.

Por exemplo automações robôs Eles têm padrões pré-definidos Muitas vezes eu posso detectar esses padrões para conseguir bloquear usuários que tentam fazer coisas maliciosas de forma repetidas Eu posso também adicionar alguns desafios adicionais como por exemplo capture ou mesmo autenticação em dois fatores para casos suspeitos que estão tentando fazer coisas repetidas ou que o a velocidade de cliques por exemplo é mais rápida do que o humano conseguiria fazer Isso é um sinal clássico de bote.

Então regras de prioridade que não dependam da velocidade do clique pode ser interessante também.

Além disso é importante notar que uma arquitetura baseada exclusivamente em quem clicar primeiro ela pode incentivar justamente a automação e gerar injustiça Claro que muitas vezes isso não vai depender da arquitetura vai depender também da regra de negócio que é o caso da Unipampa.

Então não importa quem se matriculou primeiro o que importa é quantas vagas tem e qual é o critério qual é o ranking da pessoa e assim por diante.

Então a própria regra de negócio ela precisa ser redesenhada Muitas vezes você pode conversar com o cliente mas quem vai tomar essa decisão no final das contas precisa ser o cliente.

Então em alguns momentos a sua arquitetura ela consegue resolver em alguns momentos a arquitetura por si só ela não consegue tomar conta de todo o problema bom.

Então a segurança também pode ela pode significar projetar os processos menos vulneráveis ao abuso e não somente o software em si.

Então a gente falando do processo como um todo muitas vezes e você pode inclusive dar ideias pro seu cliente Olha que tal se nós fizéssemos dessa maneira aqui ao invés dessa outra O sistema pode ajudar pode viabilizar isso.

Por exemplo uma lista de espera Uma lista de espera é um ativo de integridades no nosso sistema.

Então a arquitetura ela precisa responder como a posição ela é calculada O critério é horário é prioridade acadêmica ou é outra regra Existem um ranking como na Unepampa por exemplo Quem pode modificar essa ordem ela é automática ou alguém pode simplesmente passar um na frente do outro E se isso acontecer essas mudanças elas deixam histórico existe um log para isso o estudante ele consegue apenas consultar a sua oposição ou ele consegue consultar a oposição dos seus colegas também Esse processamento ele é automático ele ocorre e quando E se acontecer surgir uma nova vaga o que que vai acontecer quando surgir nova vaga quando o professor fala: "Não beleza eu quero fortar mais vagas" Aconteceu com software seguro eram 40 50 vagas lotou a turma nós subimos para 100 vagas lotou a turma e eu falei pro Paulo aumenta E ele aumentou para tudo que dava acho que tem 116 anos nessa disciplina.

Então nesse caso assim o professor sou eu concordei em ter bastante alunos o a coordenação não achou problema a coordenação acadêmica também liberou então o sistema permitiu né.

Então conseguimos atender todo mundo que quis fez essa disciplina que fazendo.

Agora o que acontece em um sistema onde falta e falta vagas e alguns têm que ser priorizados e outros não Como é que eu evito por exemplo convocações duplicadas também Como que o próximo estudante ele é chamado quando caso haja ã um interesse desse estudante e um dos outros que manifestou o interesse não está mais disponível Um funcionário não deveria simplesmente movimentar silenciosamente uma pessoa para o início da fila.

Então isso deveria gerar um log deveria existir também uma permissão uma justificativa para fazer essa modificação uma auditoria E talvez ter uma aprovação adicional Daqui a pouco a secretaria fez alguma coisa que não é comum a coordenação tem que ir lá e dar um OK e dizer: "Não OK realmente tô de acordo com isso.

Além disso temos que pensar então sempre na observabilidade e na auditoria das ações que são feitas no sistema O sistema ele precisa permitir detecção e investigação de eventos Todo sistema precisa disso No meu caso aqui no meu sistema de matrículas eu começo desde a tentativa de login.

Por exemplo alguém tentou fazer muitos logins Opa isso estranho não deveria acontecer Alguém tentou fazer alteração de vagas Opa por que que tô alterando duas vagas não É porque o professor Silva ele autorizou aceitou dar aula para 116 pessoas a coordenação autorizou coordenação acadêmica distava tudo bem Beleza então funcionou.

Então não há nenhum problema isso está registrado.

Agora uma matrícula excepcional fora do prazo ou um cancelamento administrativo por que que foi cancelado por que que a secretária folé cancelou a matrícula do aluno se ele solicitou Tem que ter no mínimo justificativa um log daquilo quando alguém muda alguma regra também importante tem que ficar registrado.

Quando alguém até era altera permissão o professor Silvio ele não era da coordenação agora ele virou coordenador ele precisa de algum acesso ali para poder alterar número de vagas e disciplinas.

Então isso tem que logado Quem foi a pessoa que deu esse acesso pro Silvio Por que que agora ele consegue fazer isso exportação em massa também a pessoa quer fazer download de todas as informações do sistema exportar tudo Será que não é um atacante querendo roubar as informações.

Então isso tem que ser monitorado tem que ser logado e quando tem alguma falha de validação por exemplo isso tem que logado alguma pessoa tentou fazer alguma coisa que não poderia por mais que ela seja barrada isso tem que estar tem que estar sendo registrado e sendo mostrado.

Então nós temos que ter essa observabilidade por parte daquela pessoa que cuida que toma conta no sistema Uma títula de auditoria ela deveria registrar por exemplo a identidade do operador Isso é importante pessoal Talvez vocês queiram fazer isso no sistema de vocês na hora de vocês escreverem ali o seu relatório final Vocês podem colocar justamente o que que uma auditoria vai registrar.

Por exemplo eu poderia registrar a identidade do operador a ação que ele realizando qual que é o estudante afetado No meu caso pensando em matrículas eu tenho um estudante afetado que é a vítima digamos assim eu tenho também a data e horário do que aquilo aconteceu a turma disciplina que está sendo usada naquele momento daquela operação Qual que é a origem que fazendo esse tipo de operação Qual que é o resultado.

Ou seja como é que estava o status por exemplo de uma matrícula e como ele ficou qual a justificativa Porque que isso acontecendo Eu posso então ter esses conjunto de informações a serem registradas numa trilha de auditoria Vamos dar um exemplo aqui Eu poderia escrever que o usuário secretaria 14 cancelou a matrícula do estudante 20260093 na turma ES001 às 14:32 mediante judicativa registrada no processo 4521.

Então esse registro ele vai possui muito mais valor do que matrícula atualizada.

Se eu tiver no log assim matrícula atualizada isso não merece quase nada Mas se eu tiver usuário secretaria 14 alterou a matrícula do estudante 2023 E percebe que eu tô tendo informações para entender o que aconteceu e o por que aconteceu Inclusive para eu ligar paraa secretaria daqui a pouco e perguntar ó por que que aconteceu isso Por que que esse usuário teve sua matrícula alterada Percebe E percebe que a própria auditoria por si só ela já é um ativo Eu preciso proteger a auditoria.

Se o mesmo administrador que altera uma matrícula ele também pode apagar os registros a evidência ela perde valor.

Então portanto usuários comuns eles não podem alterar registros Ações administrativas sobre logs precisam ser restritas A retenção precisa ser definida ou seja quem que pode apagar um log alguém poderia apagar um log Horários precisam ser consistentes também Não adianta eu ter um servidor com horário desatualizado Eu preciso ter também eventos relevantes sempre sendo enviados armazenamentos protegidos Não adianta também salvar banco de dados alguém lá e apagar depois e conseguir tapar os rastros As consultas aos próprios logs elas devem ser aditadas.

Por exemplo o Silvio olhando os logs do Silvio mesmo Será que por quê Por que que ele olhando seus próprios logs.

Então isso pode ser deve poder ser auditado também Nós precisamos também evitar que dados sejam excessivamente registrados Não adianta também eu ter informações para mais tanto em termos de volume quanto em termos de conferencialidade Não posso registrar nos meus logs ali senhas token completos segredos informações pessoais desnecessárias conteúdo integral de documentos sem judicativo também vai acabar deixando o log muito poluído muito grande Eu não vou conseguir depois acessar e ler direito aquele log para conseguir entender o que que aconteceu.

Então além disso a arquitetura ela deve pensar ou melhor você deve pensar numa arquitetura que tenha uma reação rápida que você consiga tomar uma ação de resposta rápida depois de que você tenha observabilidade Não adianta você só poder observar e não fazer nada.

Então você tendo a observabilidade além dos logs que são mais passivos digamos assim que você pode olhar depois pro que já aconteceu você pode ter visualizações em tempo real especialmente se você tiver notificações que avisem: "Olha alguma coisa também acontecendo.".

Por exemplo se uma conta administrativa for comprometida nós precisamos conseguir bloquear aquela conta quanto antes revogar as sessões que ela logou identificar as ações realizadas Opa alguém roubou a conta da secretária mas o que que ela fez nas últimas 24 horas Vamos tentar verificar Opa fez coisa estranha aqui não deveria ter feito Tem como reverter essas alterações Quanto mais rápido for essa reversão melhor vai ser menor vão ser os danos tem que também preservar evidências para eu conseguir entender depois o que aconteceu notificar os responsáveis essa parte da notificação é bem interessante também e também restaurar os dados corretos.

Então percebe que a própria auditoria ela vai ter ali ã funcionalidades de segurança onde você pode voltar para um estado íntegro do sistema um estado seguro.

Se você tiver isso implementado E o usuário não vai pedir isso na primeira conversa lá atrás.

Então você tem que pensar muitas vezes na etapa de arquitetura mesmo em formas de você garantir que tudo isso seja preservado caso alguma coisa aconteça no seu sistema Parece que isso agora talvez esteja ficando mais trivial para vocês conforme nós estamos conversando Mas eu tenho certeza que no início da disciplina muitos de vocês não pensavam dessa maneira Eu espero que agora vocês tenham essa luzinha de ideia de pensar de uma maneira um pouco diferente olhar com uma visão um pouco diferente pra forma de criar um sistema Não é só criar o sistema em termos de funcionalidades mas sim pensar em o que fazer se der ruim O sistema ele permite eu perceber que algo deu ruim eu consigo voltar ao estado consistente Isso é bastante interessante.

Se uma recar acadêmica por exemplo for configurada incorretamente e centenas de matrículas forem processadas o sistema tem que permitir identificar as decisões afetadas compreender a versão da regra utilizada reprocessar os casos corrigir sem perder rastraabilidade Isso pode ser obtido através por exemplo diversionamento de regras de ofertas de configurações decisões políticas de acesso.

Então isso tudo pode ser e deve ser versionado.

Ou seja sempre que alguém trocou uma regra sempre que alguém atualizou alguma alguma informação importante que vai gerar decisões a partir daquela informação com por exemplo uma política de acesso isso precisa ser registrado.
