## AULA 06: Da ameaça ao risco: como priorizar o que realmente importa

### TRANSCRIÇÃO DA AULA

E aí pessoal, tudo certo? No vídeo anterior nós usamos o Strid para analisar o sistema acadêmico que é o sistema de exemplo que eu estou usando para que vocês consigam ter uma base de como modelar ameaças OK O que nós não fizemos ainda foi discutir pelo menos não em profundidade como avaliar o risco dessas ameaças Nós já vimos no vídeo anterior que pode ser que algumas das ameaças saltem os olhos do cliente.

Por exemplo opa eu não posso de jeito nenhum fazer com que um cliente perca a matrícula porque alguém cancelou a solicitação dele indevidamente ou porque o sistema não estava disponível no momento da matrícula Nesse vídeo então nós vamos partir desse entendimento para transformar ameaça em risco O ponto principal dessa aula é as ameaças elas não têm um mesmo peso caso um atacante consiga explorar vulnerabilidades que concretizem essas ameaças.

Então cada ameaça ela merece receber um peso de atenção diferente porque o prejuízo é diferente mas não é só o prejuízo que entra nessa conta porque daqui a pouco eu tenho uma probabilidade muito grande de acontecer uma ameaça ela provavelmente vai acontecer e o prejuízo ele é pequeno ou razoável enquanto outra ameaça que tem um prejuízo muito grande ela tem uma probabilidade muito pequena de acontecer.

Então percebe que nós já conseguimos aí ter pelo menos dois parâmetros Um deles é a probabilidade e outro é o impacto ou prejuízo.

Então na verdade para analisar risco precisamos fazer três perguntas A primeira pergunta é: bom qual situação pode acontecer A segunda pergunta é: qual a probabilidade disso acontecer E a terceira pergunta é: qual é o prejuízo que isso vai levar caso se concretize.

Quando eu falo prejuízo diretamente ligado ao impacto Bom antes de prosseguirmos vamos entender a diferença de ameaça para vulnerabilidade para ataque e risco A ameaça que são aquelas coisas que o framework stride tenta nos ajudar a identificar Elas representam coisas que são capazes de gerar dano como por exemplo uma pessoa mal intencionada ser capaz de exessar uma conta de um estudante Já a vulnerabilidade ela é uma fraqueza capaz de facilitar esse problema Com fraqueza eu quero dizer que é necessário implementar algum controle que não existe.

Se esse controle não existe o sistema está vulnerável Assim como você não toma uma vacina pra gripe por exemplo você está vulnerável ao vírus da gripe Um sistema que não implementa um controle de segurança ele está vulnerável a aquele problema que ele deixou de implementar o controle.

Nesse caso um sistema que aceita somente usuário e senha por exemplo e não força o sistema a exigir do usuário por exemplo uma senha forte no mínimo sem nem falar em autenticação de dois fatores que seria o ideal nesse caso isso seria uma vulnerabilidade Imagina um usuário que coloca lá nome Silvio senha 1 2 3 Facilmente ferramentas automatizadas conseguiriam explorar essa fraqueza na senha E graças ao sistema que permitiu essa senha 1 2 3 ser cadastrada o sistema está vulnerável.

Então um atacante ele pode aproveitar essa vulnerabilidade para fazer um ataque Fazer o ataque é justamente encontrar a vulnerabilidade e explorar consumar o fato de transformar aquela ameaça em um dano real e de fato gerar prejuízo.

Então assim a ameaça ela não gera prejuízo Ela tem potencial de gerar prejuízo se não houver um controle ou seja se houver vulnerabilidade relacionada àquela ameaça Aí sim um atacante que encontra uma vulnerabilidade ele executa o ataque e consuma o fato gerando um prejuízo Já o risco ele representa a probabilidade de um atacante conseguir consumar o fato explorar uma vulnerabilidade e gerar um impacto negativo no sistema No nosso exemplo de matrículas é um sistema que permite com que algum atacante e atrapalhe o usuário e acabe carretando no prejuízo de perda de matrícula ou atraso no percurso acadêmico Esse seria o risco final A probabilidade disso acontecer é o nível de risco que nós estamos falando sobre essa ameaça de eliminar por exemplo desmatricular ou desligar um estudante Até agora o Stride nos ajudou a enxergar diferentes tipos de ameaças Baseado nessas ameaças que o Stride.

identificou nós podemos executar a análise de risco A análise de risco ela vai adicionar probabilidade impacto e por consequência prioridade A equipe ela vai precisar analisar cada contexto dentro do sistema como um todo.

Então é importante que vocês entendam que o stride ele não serve ele não foi feito ele não propõe análise de risco de forma automática ele apenas está limitado a ajudar com que você enumere as ameaças E você percebe que para analisar risco não adianta você inventar números se você precisa conhecer o domínio ou conversar com alguém que conhece o domínio e consiga mensurar os impactos caso alguma operação saia errado No vídeo anterior nós fizemos um exercício onde a pessoa pergunta pro entrevistado no caso desse sistema aí de matrícula qual operação poderia dar muito errado para o estudante ou para a universidade.

Nesse caso nós já conseguimos verificar com base no nosso cliente final que por exemplo um estudante perder a vaga ou alterar o número de vagas de uma disciplina seria algo bastante prejudicial.

Então essa resposta nos ajuda a analisar o impacto Nós não estamos apenas limitados a analisar de forma técnica Nós estamos também considerando o domínio quais são os impactos administrativos acadêmicos e institucionais que essa ameaça levaria ao sistema ou melhor a quem usa o sistema Você também pode aproveitar a conversa com o cliente para você tentar entender quais são as preocupações mais plausíveis Uma coisa é você entender o impacto outra coisa é entender probabilidade Ele poderia dizer por exemplo que um estudante ser invadido ou ele ter a sua identidade vazada não é tão incomum porque historicamente ele observa por exemplo que estudantes reutilizam credenciais ou utilizam credenciais fracas.

Então a plausibilidade ou seja a probabilidade de acontecer o ataque que explora uma ameaça de spoffing ele provavelmente deve ser classificado como alto.

Ou seja não é nenhum absurdo Ao contrário é bastante provável imaginar que um estudante reaproveita uma credencial vazada ou usa uma credencial falsa porque isso já foi observado historicamente E o cliente que conhece o domínio provavelmente não seria o reitor mas seria por exemplo um especialista de TI da Unipampa ou da universidade que está comprando o sistema ele já saberia que esse sistema é recorrente no seu tipo de usuário Isto é que essa ameaça de fato ela está presente atualmente nos seus processos Outra coisa que o cliente pode dizer é que é comum que haja sobrecarga nos momentos onde o calendário acadêmico estabelece o período de matrículas.

Então isso é um outro caso que merece atenção.

Ou seja essas respostas elas nos ajudam a calcular a probabilidade Elas não vão garantir que de fato aquele problema vai acontecer mas elas ajudam nosso perceber que isso é plausível ou melhor que existem razões para que nós consideremos aquilo plausível dentro do contexto ao qual que nós estamos resolvendo um problema de software Existem diferentes métricas para o cálculo de risco Uma das métricas mais simples é você simplesmente pontuar por exemplo numa escala licid de 1 a 5 o risco dividido entre quando eu falo dividido não é uma divisão pessoal é separado entre a probabilidade e o impacto.

Então por exemplo se você dá uma nota de 1 a cinco para a probabilidade de uma coisa acontecer e depois dando uma nota de 1 a cinco para o impacto daquilo acontecer você consegue multiplicar esses dois valores e aí ter o risco.

Por exemplo não é uma médica universal mas é a métrica mais simples para você simplesmente multiplicar um valor pelo outro E por exemplo um risco cinco H seria ou melhor um risco 25 nós fsemos usar o produto seria uma probabilidade C impacto 5 ou seja mais alta probabilidade que aquilo provavelmente vai acontecer se não for tratado e que se acontecer vai o sistema indisponível ou vai causar um dano muito grave.

Ou seja esse seria o mais alto risco com pontuação 25 Nessa escala que nós estamos exemplificando aqui de forma verbal nós podemos separar esses graus de riscos ou severidade como nota um para baixa dois para média baixa três para média quatro para média alta e cinco para alta Ou podemos usar um outro formato que é simplesmente não ter o valor intermediário.

Ou seja ao invés de fazer de um a C a gente faz de 1 a qu Ou ela é baixa ou média baixa ou é média alta ou é alta Já para o impacto nós podemos usar também uma escala de 1 a qu baixo moderado alto ou muito alto.

Com isso após multiplicarmos os valores quando nós tivermos o valor da multiplicação entre 1 e 3 podemos classificar o risco como baixo De 4 a 7 podemos classificar como moderado Já de 8 a 11 já é um risco alto de 12 a 16 seria um risco crítico 16 Considerando aquela escala de 1 a 4 ou seja 4 x 4 16 maior probabilidade de algo acontecer com maior impacto caso aconteça.

Ou seja isso aqui é crítico seria a primeira coisa a ser corrigida a primeira coisa que requer uma solução para que não fique vulnerável de maneira alguma Vamos voltar então pra parte onde eu mostro para vocês como fazer isso no git Primeira coisa que a gente vai fazer aqui é pegar aquele documento que nós criamos anteriormente e organizar um pouquinho melhor ele depois nós queramos um ridm completo mas nesse ponto nós já podemos separar as coisas Vamos deixar por enquanto no RIDM os pontos um e dois que é a identificação do sistema e descrição do sistema como todo Daqui para baixo a gente vai criar documentos separados para organizar um pouquinho melhor as coisas bem.

Então vamos apenas fazer uma breve reflexão sobre o que que nós temos aqui O item três ele já fala de pontos de inserção e componentes ativos importantes ou seja falando aqui sobre usuários ativos e pontos de interação Vamos fazer o seguinte vamos tirar essa parte daqui vamos fazer um comet e vamos escrever aqui deixando o readm readmuto Vou fazer um commit e agora eu vou criar um novo arquivo Lembra como é que faz o novo arquivo no git.

Se nós tivermos aqui nós podemos vir aqui para editar o anterior ou vir em D file por exemplo fazer um upload de um arquivo que já existe ou criar um arquivo novo.

Nesse caso eu vou criar um arquivo novo e vou colar aqui o conteúdo que eu acabei de copiar lá Mas eu não vou deixar todo o conteúdo aqui Eu vou deixar organizadinho.

Então eu vou deixar aqui apenas a análise dos resultados da conversa com o cliente onde nós identificamos os usuários ativos e pontos de interação.

Então este conteúdo vai ser o nome do meu RIDM aqui Na verdade não mais RIDM Vai ser o novo o nome do meu MarkD aqui Que vai substituir o RIDM Na verdade percebe que eu não tô substituindo A palavra pode ficar confusa para vocês.

Então apenas para explicar O RIDM continua lá Mas parte do conteúdo do RIDM ele foi extraído e está indo para um arquivo novo Esse arquivo vai se chamar usuários ativos e pontos de interação.

Então é o item três que nós tínhamos antes Eu vou tirar então o item quatro que é visão geral ou da arquitetura ou fluxo para um arquivo separado e o restante também.

Então vamos jogar tudo para o nosso contrtrl X aqui nossa área de transferência e vamos fazer um commit dizendo justamente isso aqui ó Create ou em português criação do arquivo de definição de usuários ativos e pontos de interação Vou fazer um commit e vamos criar um novo arquivo Percebe que ag não tem só o RIDM Temos o RIDM e temos também o nosso segundo arquivo que aqui contém a toda a estrutura Por que que diferente Por que que o RIDM ele bonitinho e o outro não É porque faltou eu colocar ponto MD A gente vai vir em editar vai colocar no final aqui o MD e com isso o percebe que já ficou olha só antes do MD depois do MD já ficou com formatação.

Então o browser ele já reconhece que o arquivo MD ou seja MarkD até vou adicionar aqui ó adicionando extensão Mark O browser reconhece que a extensão Markdow ela representa um arquivo markd.

Então automaticamente ela vai ter a capacidade de processar esse arquivo Ele deu algum erro aqui que eu não faço ideia porque que aconteceu Vou só seguir a sugestão deles que é download na um reload na página Deu certo Foi algum erro interno do Git mas desconsiderem um erro aqui então o nosso RIDM com informação básica aqui o nosso arquivo de usuári dos ativos pontos de interação MD.

Agora que ele é MD ele já no formato markd.

Então percebe que aqui nós temos todas aquelas tabelinhas todos aqueles arquivos importantes pontos de interação e componentes aquilo que nós fizemos na etapa de modelagem de ameaças no vídeo anterior já está aqui OK Feito isso eu vou voltar pra raiz do projeto e vou adicionar um novo arquivo create new file E eu vou escrever aqui antes de colocar o nome vamos ver o que que vai ter dentro Nós vamos ter aqui então a visão geral da arquitetura ou fluxo Isso aqui e pode até fazer parte na verdade do nosso RIDM.

Então eu vou pegar essa parte aqui vou deixar no contrtrl X guardadinho aqui Pro radm e vou deixar para esse arquivo aqui o conteúdo que fala da modelagem da ameaças.

Então vou criar um arquivo chamado modelagem de ameaças pon que aí ele fica com formatação bonitinha olha assim olha só.

Então mod da mea é o cinco e o seis é o caso de abuso Como eu acho que relacionado eu já vou deixar aqui modeste da ameaça e casos de abuso E nós temos aqui o arquivo que contempla as duas coisas ao mesmo tempo Temos também lá no final as considerações finais Por enquanto eu vou deixar aqui Lembrando pessoal isso aqui é só uma demonstração Vocês depois podem ficar livres para organizar como vocês bem entenderem e conseguir deixar esse repositório organizadinho bonitinho Isso aqui é mais para vocês entenderem que é possível criar vários arquivos e organizar o código de vocês ou nesse caso a documentação de vocês de forma versionada Lembrando que cada commit desses ele gera um novo marco que pode ser considerado se um dia eu precisar ver o que que mudou ou mesmo se eu quiser restaurar o estado para o momento anterior.

Então vou dar o meu comite aqui Lembrando que se eu vir em histórico eu já consigo ver que tem sete comites.

Ou seja que que o Silvio fez Fez um comite inicial há 7 horas atrás Olha quanto tempo eu estou gravando vídeo para vocês Depois 6 horas atrás ele adicionou a identificação do sistema depois ele fez a a entrega final do enunciado um há 5 horas atrás Depois ele deixou o RIDm mais enxuto isso foi há 5 minutos atrás Criou então aqui o o arquivo de definição de usuários ativos etc Depois o renomeou então esse nome esse arquivo para MD percebe que o fato de renomear aqui não era MD aqui MD ele gera um registro.

Então nós conseguimos ver se eu clicar aqui por exemplo eu consigo ver que nada mudou mas ele fez a renomeação O git ainda fala: "Olha arquivo renomeado sem alterações.".

Então eu consigo ver se alguém simplesmente renomeu por exemplo um arquivo bom pessoal E no final eu tenho aqui a criação do arquivo modelagem de m caso de abuso md Beleza Nós ainda temos coisas no nosso contrl X aqui que na verdade é as nossas considerações finais.

Então isso aqui eu vou deixar para vocês julgarem o melhor espaço para esse trecho aqui.

Então como o objetivo nesse caso aqui era chegar justamente aos casos de abusos e modagem de ameaças eu vou deixar isso aqui esse trecho de contas nacionais junto com esse arquivo markdown aqui.

Se vocês quiserem organizar diferente disso vocês podem ficar totalmente à vontade para organizar como vocês entenderem desde que fique legível depois bem.

Então procurem caprichar na organização de vocês pessoal Aqui eu consigo ver então cada um dos arquivos bonitinhos vendo E faltando aqui parecendo um arquivo Vamos dar um F5 para ver faltando um dos arquivos O que que eu fiz aqui enquanto eu conversava com vocês aqui o até o item três onde nós colocamos os últimos nós não criamos Eu pensei que nós tínhamos criado.

Então é por isso que eu falei.

Então meu cérebro não deixou me enganar Nós temos de fato coisas não aqui não é verdade o o item que faltava aqui.

Então o item cinco seis e o sete estão aqui.

Então voltando aqui está o nosso conteúdo completo Temos o RIDMI temos o nosso arquivo de usuários e temos aqui a modelagem de ameaças.

Então percebam que da forma que eu fiz já não é a forma ideal já ficou bagunçado eu mesmo me perdi.

Agora como eu falei isso aqui é apenas uma demonstração para vocês entenderem que é possível fazer uma organização da forma que vocês vão organizar eu espero que eu consiga depois me achar de maneira tranquila e fácil ser fluído beleza.

Então fique à vontade aí para vocês organizarem da melhor forma E dando continuidade na nossa aula de hoje vamos falar agora sobre como catalogar aquelas vulnerabilidades Mas antes ainda das vulnerabilidades vamos falar sobre como transformar isso aqui em modelagem de riscos.

Para deixar um pouquinho mais legível Como eu mesmo acabei de me perder na minha organização aqui eu vou colocar no nome do arquivo já passos.

Então vou colocar aqui ó passo um e vou dar um commit commit change E aqui eu vou colocar passo dois entre parênteses entregável um Por que entregável um É porque o enunciado de vocês falava justamente que no entregável um no primeiro enunciado vocês precisavam mostrar a modelagem de ameaças e casos de abuso que é o que está aqui.

Então agora já mais fácil agora não me perco mais No passo um eu tenho usuários ativos e ponto de interação percebe Eu poderia até deixar isso aqui no readm caso eu quisesse deixar toda a informação base lá e depois teus entregábitos Como é que eu faria isso Eu posso editar copiar e colar para lá.

Nesse caso eu vou deixar assim o Ridm vai me dizer o que é o sistema o que que ele faz quem são os integrantes do grupo O passo um eu vou mapear os detalhes do sistema os ativos importantes etc E o passo dois vai ser já a modelagem de ameaças com stride.

Se vocês quiserem deixar o passo um passo dois junto fiquem à vontade também Como eu falei vocês vão ficar à vontade para organizar da forma que vocês bem entenderem esse repositório mas tem uma estrutura sugerida lá no enunciado.

Então abre um anunciado lá tem uma estrutura bonitinha com pastinhas fica bem mais legal bem mais fácil de se achar se vocês seguirem aquela estrutura que está lá Bom pessoal não se confundam com as refaturações que eu fiz É só uma demonstração de que vocês devem o tempo todo reconsiderar a organização e deixar da maneira mais organizada possível Mas o nosso foco dessa aula não é organização o nosso foco é criar um novo arquivo.

Para quê paraa nossa próxima etapa que já é o segundo ponto da disciplina aí que é justamente análise e hiperização de riscos.

Então já tenho aqui meu ponto MD eu vou justamente colocar esse nome aqui no meu MD pd Isso aqui minha análise Eu vou fazer um convite primeiro para vocês visualizarem como está Vou deixar create porque justamente o que eu tô fazendo Tô criando o meu markdown Lembra que eu tava colocando estrutura de passos Vamos renomear de novo para ficar com o passo três Recomendo vocês seguirem alguma estratégia parecida com essa tanto para vocês se acharem quanto para eu me achar na hora que eu for avaliar vocês pessoal Ó tô comentando E agora vamos pra parte técnica Finalmente chega de falar de MD e de git Lembra então que nós tínhamos já nossa tabelinha stride onde nós identificamos algumas categorias de ameaças e já identificamos quais são os componentes que eram os atacados Eu vou pegar aqui por exemplo o último Controle de acesso que é a nossa nosso componente é o ativo.

Então o módulo de controle de acesso é o nosso ativo que está ameaçado A ameaça nesse caso aqui é elevação de privilégios Alguém faz login com uma conta de estudante por exemplo daqui a pouco consegue cadastrar novas ofertas de disciplinas ou alterar número de vaga Seria possível se ele conseguisse levar ao privilégio e fazer coisas que somente a secretaria ou coordenação pudesse fazer Qual que é a descrição disso A ameaça disso aqui é que um estudante explora uma falha de autorização e obtém permissões de secretaria ou administrador que foi exatamente o que eu falei agora Qual que é o possível impacto é alteração de ofertas vagas permissões e matrículas de outros estudantes Imagina o cara que não gosta do coleguinha e simplesmente coloca ele como desmatriculado ou elimina ele do curso Parece brincadeira mas isso poderia acontecer se o sistema permitisse e se não houvesse depois uma.

rastreabilidade.

Se o aluno falar que olha eu não fiz isso eu não me matriculei nessa disciplina ou pior eu não cancelei minha matrícula e não tiver nada no sistema que ajude a rastrear esse comportamento e não tiver nada que impeça que algum usuário malicioso faça isso com o seu colega não tem como a instituição voltar atrás A instituição tem que seguir as próprias normas e ela vai ter que desligar eventualmente aquele estudante porque ele não se matriculou no prazo.

Então perceba a gravidade das coisas Não é nem má vontade é questão legal é questão normativa da própria instituição não vai ter o que fazer ok Isso só para lembrar o que nós fizemos no passo dois modelagem da ameaças Na próxima etapa nós vamos analisar e priorizar esses riscos baseados justamente nesses pontos que nós falamos no início desse vídeo que é o impacto e a probabilidade daquilo vir a acontecer e de fato então transformar aquele risco num risco crítico.

Então olha só eu tô reportando aqui no meu na minha versão demo de resolução do próprio enunciado que eu passei para vocês onde no meu caso a análise de risco foi realizada a partir da massa identificada no stride ou seja é justamente que eu quero que vocês façam e dos casos de abusos descritos anteriormente.

Então essas são as entradas pessoal parte do stride dos casos de abuso para vocês fazerem an de risco E para cada um desses riscos vocês vão ter que avaliar o evento que pode causar prejuízo qual que é a ameaça relacionada.

Então aqui a gente falando de stride de casa de abuso ainda E depois nós vamos paraa transição em relação à próxima etapa que é a vulnerabilidade ou condição que permite esse evento Qual falta de controle É a falta de uma autenticação mais forte é a falta de uma criptografia O que que impedindo que eu tenha o software seguro O que que viabilizando que essa ameaça se torne uma vulnerabilidade O que que deixa vulnerável o sistema É isso que a gente tem que discutir aqui E qual que é a probabilidade e impacto da ocorrência.

Então isso vocês vão conseguir geralmente conversando com o cliente de vocês vocês podem inclusive perguntar ã o quão prejudicial seria se um aluno perdesse a matrícula O cara faria meu Deus se ele perde a matrícula ele desligado mas qual que é a chance de acontecer Ele fala: "Olha a chance é alta Basta que ele não se matricule ou que alguém cancele sua inscrição.

Então aí você consegue ver: "Opa isso aqui tem criticidade alta" eu preciso dar muita tensão para não deixar que ninguém cancele a matrícula de um aluno coitado vai ser desligado.

Então o impacto é grande a probabilidade de acontecer também pode ser grande nesse caso hipotético que eu tô falando para vocês E por fim vocês vão atribuir a pontuação em nível de prioridade Lembrando que no exemplo que nós vimos anteriormente a pontuação ela é uma multiplicação E nós vamos dividir aí a probabilidade por exemplo entre 1 2 3 e 4 que é baixa média baixa média alta e alta Lembrando que baixa é quando o evento depende de condições incomuns ou seja não é fácil de acontecer mas pode ser que aconteça é um acesso muito específico ou grande capacidade técnica alguém que domina muito a a tecnologia e enfim e consegue explorar uma vulnerabilidade difícil enquanto que o alto é o contrário O alto é um evento que pode acontecer com facilidade ou grande frequência ou durante condições previsíveis do sistema É uma falha mais esdrúchula uma falha mais fácil de acontecer E aí tem os.

meiotermos o event plaível ou ele é possível se for média baixa ele depende de uma vulnerabilidade ou condição específica.

Se for média alta ele é plausível e pode acontecer em situações comuns de uso ou de ataque.

Então é basicamente assim que a gente atribui a nossa probabilidade.

Então você pode usar essa referência também para vocês se perguntarem quão provável é desse evento malicioso acontecer pro impacto parecido Vocês vão ter impacto baixo quando causa pequeno transtorno e pode ser corrigido rapidamente Moderado quando causa interrupção ou uma inconsistência mas que essa inconsistência ou interrupção é limitada que tem uma maneira de recuperar.

Então isso é um impacto moderado E assim gerou um impacto foi prejudicial mas nem tudo perdido O impacto alto é quando causa um prejuízo acadêmico administrativo tem uma exposição por exemplo relevante de informações.

Então aqui já complicado Mas não é o pior dos mundos ainda porque tem o muito alto que é quando pode afetar muitos usuários pode comprometer operações críticas ou causar prejuíz prejuízos graves.

Por exemplo pode impedir um curso de funcionar pode impedir um monte de usuário a continuar matriculado.

Então isso sim será um impacto muito alto Geralmente a gente relaciona o impacto alto algo que afeta o sistema como um todo ou muitos usuários enquanto o alto poderia ser o prejuízo acadêmico mais pontual Mas que ainda assim é alto OK Como é que nós fazemos a calculação A calculação Como é que nós fazemos o cálculo Basicamente e não existe uma fórmula universal como nós já falamos antes mas você pode simplesmente multiplicar a probabilidade vezes impacto e você vai ter aquela pontuação.

Se o resultado for de 1 a3 é baixo 4 a 7 é médio 5 11 a 8 ele é alto e 12 é 16 é crítico.

Então isso aqui foi basicamente o que nós estabelecemos anteriormente nessa aula E aqui eu tô só mostrando para vocês como vocês podem reportar essa decisão no relatório de vocês certo pessoal Mas não para por aqui essa etapa Nós podemos também ir além e agora nós temos um item 8.4 4 onde nós podemos mostrar por exemplo o nosso registro de risco Tudo isso aqui percebe que é é é o framework é a forma com que nós temos o nosso método de categorizar os riscos Nós podemos ter um novo arquivo que é o passo quatro Vamos criar aqui o passo quatro passo 4 E nesse passo 4 nós vamos ter o item 8.4 4 que é justamente o registro de riscos.

Então por isso que eu vou colocar esse nome p MD para formatar bonitinho e vou comitar para nós conseguirmos visualizar lá justamente na forma gráfica que fica mais fácil de verificar Vamos para o passo quatro Que que nós temos no passo quatro Nós temos o registro de riscos onde nós temos a origem stride ou seja é spoofy é temp todas as letrinhas do stride que originou aquele risco Isso aqui é a primeira coisa a se fazer Depois disso nós podemos ver de fato qual que é o evento de risco E aí entra uma especificidade como por exemplo um atacante acessa a conta de um estudante e realiza operações em seu nomes ou matrículas vagas ou resultados são alteradas indevidamente Isso aqui já é um temper e assim por diante Nós temos uma série de possibilidades aqui de eventos de riscos acontecendo O usuário nega ter solicitado cancelado ou alterado matrícula Estamos falando de repudiation Dados.

pessoais os acadêmicos são vazados acessados por pessoas não autorizadas Information disclosure o sistema ficou indisponível durante a matrícula The service ou um estudante ele obtém funções de secretaria ou administrador de forma indevida Ele ofse aqui pessoal é um exemplo para cada categoria do stride S T R I D e E Stride é um exemplo para cada categoria ou seja vocês podem ter múltiplos eventos para cada uma das letrinhas do stride OK E aqui depois que nós temos esses eventos nós vamos além para encontrar qualquer vulnerabilidade ou condição que permite que a ameaça de fato ela exista Não só exista mas que ela seja consumada ou que ela seja suscetível a ser atacada E aqui nós podemos verificar que bom para isso acontecer a vulnerabilidade seria por exemplo a credencial estar comprometida ou tendo uma ausência de uma verificação adicional por exemplo uma verificação em duas etapas.

pelo menos para operações importantes.

Então essa é a vulnerabilidade esse é a falta de controle.

Se isso não tiver implementado é isso que vai permitir que a ameaça ela de fato gere Bom qual que é a probabilidade disso acontecer baseado na nossa conversa com o cliente nós podemos identificar que de um a quatro é alta ali no nível três E se isso acontecer qual que é o impacto Caramba isso ferrou com o sistema.

Então é alto o impacto.

Se a probabilidade de alta o impacto é alto a pontuação ela vai ser alta 11 12 na verdade se for de 11 a 16 é crítico.

Então 12 é crítico.

Então vamos olhar para essa linhazinha aqui Origin stri spuffing.

Se tiver então um evento onde o atacante acessa a conta de um estudante e realiza uma operação no nome dele ou seja falsificando entidade E para acontecer isso ele ele ele viola Ele consegue obter credenciais E além de obter credenciais não há uma validação adicional não tem uma verificação em duas etapas por exemplo para que operações importantes não sejam feitas por alguém que só tenha senha e usuário.

Então assim abrindo um parênteses hoje em dia pessoal usuário e senha não é mais segurança Usuário e senha era lá na década de 90 anos 2000 Hoje em dia nós precisamos de ter mais do que um usuário e uma senha Temos que ter pelo menos uma coisa que pertence ao usuário e uma coisa que o usuário sabe ou seja estamos falando de autenticação de dois fatores.

Por exemplo eu tenho lá um aplicativo Google do ou Google Education e lá naquele aplicativo vai ter um token único que além de eu digitar minha senha vai chegar um token único lá para eu digitar no sistema Opa aí já é mais difícil Ou eu recebo um SMS um WhatsApp um e-mail um código E além disso tem que saber minha senha também Eventualmente se algo muito crítico por exemplo eu vou cancelar minha matrícula no curso eu tenho que fazer um esquenamento facial um reconhecimento facial É o que acontece por exemplo quando eu faço um empréstimo lá no bank ou em algum banco digital.

Então pessoal grandes empresas grandes soluções já adotam contramedidas baseado justamente no que a gente falando aqui Não é uma coisa mericamente meramente acadêmica não é uma coisa meramente acadêmica é uma coisa que de fato é feito por grandes players da nossa indústria Esse aqui é o exemplo do stride com o spoof o atacante conseguindo acesso a uma operação que não deveria mas nós temos uma série de outros exemplos aqui Eu não vou detalhar todos eles pro vídeo não ficar longo mas vocês podem visualizar podem acessar esse git que eu já falei para vocês que público E aqui tem outros exemplos Um para cada categoria tem eu riscos críticos altos médios Eu vou só mostrar os críticos para vocês agora Imagina que pro information disclosure para que isso vire de fato um problema os dados pessoais ou acadêmicos eles não devem ser acessados por pessoas não autorizadas.

Então isso é o evento risístico.

Se eles forem acessados aí ferrou Aí o evento se concretizou aquela ameaça virou de fato uma um ataque porque aquela vulnerabilidade existe Quais que são as vulnerabilidades ou condições que permitem que isso aconteça.

Por exemplo a falha de autorização e validação inadequada do registro do usuário que solicita aquele aquela operação de registro.

Se eu não tô verificando de maneira adequada qual foi o usuário que fez aquilo eu tenho um problema e esse problema vai me levar então ao vazamento de dados pessoais probabilidade de acontecer isso é três baseado numa conversa com o cliente o risco o impacto na verdade ele é muito grande ele é quatro e portanto o risco 3 x 4 é 12 que fica também como crítico A mesma coisa pro caso do sistema ficar indisponível durante as matrículas A probabilidade de acontecer isso é alta porque tem muito acesso E pode acontecer alguma coisa que derruba o sistema.

Então é fácil de acontecer Isso não depende de nada muito especializado e se isso acontecer ferrou.

Ou seja o risco é muito alto Porque a probabilidade é alta e o impacto também é alto Logo é o risco máximo risco 16 crítico Como é que isso pode acontecer Qual que é a vulnerabilidade ou condição que pode permitir que isso aconteça Ausência de limitação de requisições ou capacidade insuficiente ter pouco recurso comporacional nos períodos de maior acesso.

Então percebe faltou alguém verificar que uma pessoa tentando fazer várias vezes a mesma operação isso travando o sistema e faltou eventualmente também ter recurso para potencializar a o acesso a múltiplas pessoas ao mesmo tempo.

Ou seja não tem servidor suficiente nessa instituição que aguente muitos usuários ao mesmo tempo e qualquer excesso malicioso pode acabar derrubando o sistema É por isso que a probabilidade é alta o impacto é alto e o risco é crítico Bom pessoal de nada adianta foi todo esse processo se nós não tivermos uma ação concreta a se fazer depois disso Eu cortei o vídeo aqui para não ficar mostrando uma criação de novo Pon marked porque vocês já sabem fazer isso E vamos olhar diretamente então a renderização disso para vocês entenderem o que que a gente faz depois de identificar riscos De nada adianta você apenas identificar o risco e não fazer nada com isso É por isso que nós temos que tomar uma ação concreta ter essa ação concreta é a priorização.

Então pessoal com base naquela análise que nós fizemos nós conseguimos dizer que nós temos aqui uma grande prioridade que surgiu de um risco crítico que é a indisponibilidade no período de matrículas Essa possui a maior pontuação porque tanto o impacto quanto a probabilidade são altas Isso pode afetar simultaneamente uma grande quantidade de estudantes Logo é a primeira coisa que eu vou me preocupar é a primeira vulnerabilidade que eu vou precisar resolver Detalhe pessoal observem que eu não tô falando um sistema que existe Eu tô partindo num processo onde eu nem comecei a digitar um código já tô preocupado com a vulnerabilidade Percebe como isso é interessante Como isso adianta problemas Como isso evita que isso apareça só na hora que o sistema já em produção Eu não digitei manente de código eu apenas entrevistei o cliente e baseado na minha conversa já que eu sou um cara que faz.

engenheiro de software seguro eu consegui identificar que a indonibilidade no período de matrículas possui a maior pontuação ou seja maior risco Isso pode afetar simultaneamente vários alunos.

Então eu já vou projetar meu software pensando nisso Eu também percebi que o uso indevido da conta de um estudante pode resultar em cancelamentos em perda de vagas em prejuízos acadêmicos diretos.

Então isso tem uma criticidade muito grande e é uma das principais prioridades também para que eu busque por soluções seguras na hora de implementar o software Não adianta eu entregar um software que faz matrícula não adianta Eu preciso entregar um software que consegue lidar com a indisponibilidade no período de matrículas que consegue evitar o uso indevido da conta no estudante consegue evitar a exposição de informações acadêmicas porque isso também poderia comprometer a privacidade dos estudantes permitir um acesso indevido aos dados pessoais Eu também preciso lidar com alteração indevida de dados acadêmicos porque isso poderia comprometer por exemplo a matrícula de um estudante ou de múltiplos estudantes poderia alterar número de vagas poderia danificar os resultados poderia ter a confiança no processo toda em cheque.

Ou seja se acontecer isso certamente o pessoal vai dizer: "Cara esse sistema aí não serve Vamos voltar pro papelzinho vamos pro Excel vamos comprar um outro sistema mas não usa mais sistema Eu não quero essa dor de cabeça de disciplinas gerando vagas que não existem de alunos com matrícula cancelada Vamos parar de usar esse sistema e vamos substituir esse sistema E aí você leva ao fracasso Não adianta nada você se preocupar com engenharia de software fazer software de qualidade software que escala sendo que o seu software ele não tem a segurança e a qualidade daquele software vai por água abaixo.

Então vamos lá pessoal Nós temos também aqui o outro problema que é um risco que nós devemos priorizar que é a obtenção de permissões administrativas porque isso pode permitir a alteração amplas em vários momentos e vários passos do sistema embora que dependa de uma falha específica ou autorização.

Então por isso que ela não é a mais relevante mas ela também entre as prioridades.

Para finalizar nós temos a negação tem uma operação realizada que é aquela ideia do não repúdio ou nesse caso de você ter o repúdio que é quando você nega que você fez alguma coisa.

Então nós temos um problema que dificulta investigações e contestações mas isso recebeu uma operação foi classificada como operação menos arriscada.

Então o nível de risco a pontuação foi um pouco menor então ela será a última das prioridades mas ainda é uma prioridade E para finalizar então essa segunda parte da nossa análise nós aplicamos o stride e permitimos então com isso o o quer dizer o nós não permitimos permitiu for Stride O Stride permitiu nós identificarmos ameaças múltiplas delas diferentes categorias mas a variação de probabilidade de impacto ela mostrou que elas não possuem a mesma prioridade.

Então com base no strade nós sabemos que tem ameaças e com base depois nessa análise de riscos é que nós sabemos qual ameaça atacar primeiro Os riscos eles deverão ser tratados de acordo com a criticidade aqueles que são críticos eu começo dando atenção especial a eles e depois disso eu vou para os demais bom.

Então percebe que proteção de contas disponibilidade do sistema confidencialidade de dados acadêmicos para o meu sistema ele foi eles esses requisitos foram considerados como os requisitos com risco mais crítico A classificação representa então uma avaliação inicial baseada no contexto conhecido.

Então eu conversei com o meu cliente hipoteticamente e ela deverá ser re avaliada e revisada quando surgirem novas informações sobre o sistema.

Então eu posso conversar e devo não só posso devo conversar com o cliente o tempo todo Eu não vou lá apenas na fase de levantamento de requisitos e aí já isso se aproxima bastante de metodologias ágeis da G software Eu tenho que tentar colocar o cliente como protagonista de todo o ciclo de desenvolvimento do software Eu vou mostrar para o cliente que o software está indo no caminho certo que eu estou fazendo o que ele espera Ele vai me dar aquele feedback não só em termos de funcionalidade mas também em termos de segurança que é um requisito não funcional como nós já vimos desde o início.

Então os usuários vulnerabilidades os incidentes observados eles podem ser antecipados mesmo antes do software estar em produção Não só podem como devem E é isso que nós estamos fazendo nessa disciplina da engenharia do software seguro No próximo vídeo pessoal nós vamos ver agora uma taxonomia uma forma de categorizar vulnerabilidades Já que nós fizemos isso com ameaças através do stride nós vamos ver que existe um framework da NIST que faz justamente isso com as vulnerabilidades conhecidas vamos.
