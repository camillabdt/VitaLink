# VitaLink

O VitaLink organiza dados médicos sob controle do paciente e viabiliza o acesso delimitado de profissionais de saúde.

## Linguagem

**Mensagem clínica**:
Comunicação entre profissionais de saúde vinculada a um paciente específico e ao respectivo contexto assistencial.
_Evitar_: chat, mensagem livre, conversa

**Código de acesso temporário**:
Código compartilhado pelo paciente para permitir que um profissional crie uma solicitação de acesso sem revelar dados clínicos.
_Evitar_: busca por paciente, identificador público, código de prontuário

**Ditado clínico**:
Captura temporária da fala de um profissional para produzir um rascunho textual que precisa ser revisado e confirmado antes do registro.
_Evitar_: registro por áudio, transcrição automática definitiva

**Proveniência clínica**:
Origem atribuída a um dado clínico, incluindo autor, momento e documento relacionado quando houver.
_Evitar_: fonte presumida, dado sem autoria

**Meta clínica**:
Intervalo ou objetivo definido por um profissional para um paciente e exame específicos, com autoria e data preservadas.
_Evitar_: referência média, média dos médicos

**Observação pessoal**:
Registro de saúde escrito pelo paciente sobre si, com autoria própria e separado de consulta ou anotação profissional.
_Evitar_: consulta do paciente, diagnóstico pessoal

**Sessão de ativação**:
Sessão restrita concedida depois da confirmação do e-mail exclusivamente para cadastrar e confirmar o primeiro TOTP.
_Evitar_: sessão autenticada completa, login sem segundo fator

**Fatia vertical TDD**:
Incremento pequeno e demonstrável que atravessa interface, API, persistência e controles, iniciado por um teste de comportamento pela interface pública.
_Evitar_: fase de testes, testes de implementação, camada isolada
