# Etapa 4 — Práticas de código seguro e evidências

## Estado atual

Esta etapa está **proposta e especificada, mas não implementada**. O repositório não contém código executável do VitaLink nem testes que comprovem as práticas abaixo. Os pseudocódigos orientam a implementação futura e não constituem evidência de controle aplicado.

## Práticas de código seguro propostas

| ID | Prática verificável | Origem | Evidência executável necessária |
| --- | --- | --- | --- |
| CS01 | Autorizar no servidor cada acesso por identidade, paciente, recurso, operação, escopo, período e estado da autorização; negar por padrão. | RS01, R03–R06 | Testes negativos de acesso cruzado, escopo, operação, revogação e expiração. |
| CS02 | Tratar identificadores e atributos enviados pelo cliente apenas como entrada, nunca como prova de identidade ou autorização. | RS01, R03–R04 | Teste que altera paciente ou documento e recebe negação. |
| CS03 | Reavaliar autorização, revogação e expiração em toda nova operação protegida. | RS02, R05 | Teste que revoga ou expira a autorização e comprova a negação imediata. |
| CS04 | Impedir que uma conta profissional não validada solicite ou receba acesso clínico. | RS04, R01 | Testes dos estados pendente, validado, rejeitado e revogado. |
| CS05 | Proteger autenticação, recuperação de conta e ciclo de vida das sessões, invalidando sessões anteriores quando necessário. | RS05, R02 | Testes de recuperação, expiração e revogação de sessão. |
| CS06 | Autorizar criação, alteração e exclusão, preservar versão anterior e permitir recuperação conforme política definida. | RS06, R07–R08, R15 | Testes de escrita indevida, versionamento, exclusão e restauração. |
| CS07 | Registrar ações críticas com ator, alvo, operação, resultado e horário, sem senha, token completo ou conteúdo médico desnecessário. | RS03, R09, R12 | Teste de completude, sanitização e proteção da trilha de auditoria. |
| CS08 | Mediar o compartilhamento pela API com identificador imprevisível, expiração, revogação e estado verificável. | RS07, R10 | Testes de link inválido, expirado e revogado. |
| CS09 | Limitar consultas automatizadas e detectar volume anômalo por ator e origem. | RS08, R11, R13 | Teste de limite e geração de alerta. |
| CS10 | Validar tamanho, tipo e quota antes de armazenar um upload. | RS09, R14 | Testes de arquivos acima dos limites e tipos não permitidos. |

## Pseudocódigos de referência

### Autorização por recurso e operação

```text
função autorizar_acesso(ator, paciente, recurso, operação):
    autenticar(ator)
    autorização = localizar_autorização(ator, paciente)

    se autorização não existir:
        negar()

    se autorização.estado != "Ativa":
        negar()

    se autorização.expiração < agora:
        negar()

    se recurso ou operação não pertencer ao escopo:
        negar()

    permitir()
```

### Compartilhamento temporário

```text
função criar_link(paciente, documento, período_limitado):
    autenticar(paciente)
    confirmar_que_documento_pertence_ao_paciente()
    identificador = gerar_identificador_criptograficamente_imprevisível()

    salvar_compartilhamento(
        documento = documento,
        identificador = hash(identificador),
        expiração = agora + período_limitado,
        estado = "Ativo"
    )

    retornar_link(identificador)

função acessar_link(identificador):
    compartilhamento = localizar_por_hash(hash(identificador))

    se compartilhamento não existir:
        negar()

    se compartilhamento.estado != "Ativo":
        negar()

    se compartilhamento.expiração < agora:
        negar()

    registrar_evento_de_compartilhamento()
    entregar_documento_via_API()
```

O link não deve apontar diretamente para o armazenamento físico.

### Validação de upload

```text
função receber_upload(ator, arquivo):
    autenticar(ator)

    se arquivo.tamanho > LIMITE_CONFIGURADO:
        rejeitar("arquivo acima do limite")

    se arquivo.tipo não estiver entre TIPOS_PERMITIDOS:
        rejeitar("tipo não permitido")

    se quota_do_usuario + arquivo.tamanho > QUOTA_CONFIGURADA:
        rejeitar("quota excedida")

    armazenar_de_forma_controlada(arquivo)
    registrar_evento(ator, arquivo, "upload", "sucesso")
```

Os limites, tipos permitidos e quotas devem ser definidos e configurados na implementação.

## Casos de teste planejados

| ID | Cenário | Resultado esperado | Rastreabilidade |
| --- | --- | --- | --- |
| CT01 | Profissional autenticado tenta consultar paciente sem autorização ativa. | Requisição negada e evento registrado. | CS01–CS03, R03–R06 |
| CT02 | Profissional reutiliza sessão após revogação da autorização. | Novo acesso negado. | CS01, CS03, R05 |
| CT03 | Cliente altera o ID do paciente ou documento na requisição. | Acesso fora do escopo negado. | CS02, R03–R04 |
| CT04 | Profissional não validado tenta solicitar acesso. | Solicitação rejeitada. | CS04, R01 |
| CT05 | Usuário tenta alterar ou excluir documento sem permissão. | Operação negada e evento registrado. | CS06, R07–R08 |
| CT06 | Link compartilhado expirado ou revogado é utilizado. | Documento não é entregue. | CS08, R10 |
| CT07 | Script envia consultas acima do limite. | Requisições são restringidas e o comportamento fica detectável. | CS09, R11, R13 |
| CT08 | Upload ultrapassa tamanho ou quota. | Upload rejeitado antes do armazenamento permanente. | CS10, R14 |
| CT09 | Operação crítica produz evento de auditoria. | Registro contém os campos necessários e não contém segredos. | CS07, R09, R12 |
| CT10 | Documento alterado ou excluído precisa ser recuperado. | Versão recuperável é restaurada conforme a política. | CS06, R08, R15 |

## Critérios para considerar a etapa comprovada

A Etapa 4 somente poderá ser apresentada como implementada quando houver:

1. código correspondente às práticas declaradas;
2. testes executáveis associados aos casos relevantes;
3. resultados de execução versionados ou reproduzíveis;
4. ausência de credenciais, tokens ou dados médicos reais nos artefatos;
5. rastreabilidade entre requisito arquitetural, prática e teste.
