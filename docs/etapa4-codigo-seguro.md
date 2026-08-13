    confirmar_que_documento_pertence_ao_paciente()


    identificador = gerar_identificador_criptograficamente_imprevisível()


    salvar_compartilhamento(
        documento = documento,
        identificador = hash(identificador),
        expiração = agora + período_limitado,
        estado = "Ativo"
    )


    retornar_link(identificador)
```


No acesso:


```text
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


Os valores concretos de limite, tipos permitidos e quota devem ser definidos na implementação e configurados fora do código quando apropriado.


## Casos de teste planejados


| ID | Cenário | Resultado esperado | Rastreabilidade |
| --- | --- | --- | --- |
| CT01 | Profissional autenticado tenta consultar paciente sem autorização ativa. | Requisição negada e evento registrado. | CS01–CS03, R03–R06 |
| CT02 | Profissional reutiliza sessão após revogação da autorização. | Novo acesso negado mesmo com sessão ainda autenticada. | CS01, CS03, R05 |
| CT03 | Cliente altera o ID do paciente ou documento na requisição. | API não confia no identificador e nega acesso fora do escopo. | CS02, R03–R04 |
| CT04 | Profissional não validado tenta solicitar acesso. | Solicitação rejeitada. | CS04, R01 |
| CT05 | Usuário tenta alterar ou excluir documento sem permissão correspondente. | Operação negada e evento registrado. | CS06, R07–R08 |
| CT06 | Link compartilhado expirado ou revogado é utilizado. | Documento não é entregue. | CS08, R10 |
| CT07 | Script envia consultas acima do limite estabelecido. | Requisições são restringidas e comportamento anômalo fica detectável. | CS09, R11, R13 |
| CT08 | Upload ultrapassa tamanho ou quota permitida. | Upload rejeitado antes do armazenamento permanente. | CS10, R14 |
| CT09 | Evento de auditoria é produzido após operação crítica. | Registro contém ator, recurso, operação, resultado e tempo, sem senha ou token. | CS07, R09, R12 |
| CT10 | Documento alterado ou excluído precisa ser recuperado. | Versão ou informação recuperável pode ser restaurada conforme política definida. | CS06, R08, R15 |


## Critérios para considerar a etapa comprovada


A Etapa 4 somente poderá ser apresentada como implementada quando houver, no mínimo:


1. código correspondente às práticas declaradas;
2. testes executáveis associados aos casos relevantes;
3. resultados de execução versionados ou reproduzíveis;
4. ausência de credenciais, tokens ou dados médicos reais nos artefatos;
5. rastreabilidade entre requisito arquitetural, prática de código e teste correspondente.


Enquanto essas evidências não existirem, o estado desta etapa permanece **proposto e especificado, mas não implementado**.
