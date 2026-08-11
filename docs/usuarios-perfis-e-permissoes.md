# Usuários, perfis e permissões

Este documento detalha os perfis já apresentados no [README](../README.md) e as permissões necessárias para as funcionalidades documentadas do VitaLink. A matriz usa como referência o [inventário de ativos](inventario-de-ativos.md) e não define funcionalidades do MVP que ainda não foram descritas.

## Termos usados

- **Identidade:** representação de uma pessoa no VitaLink, associada ao seu cadastro.
- **Autenticação:** verificação de que a pessoa que tenta usar uma conta corresponde à identidade cadastrada.
- **Autorização:** decisão sobre quais operações a identidade autenticada pode realizar.
- **Privilégio:** extensão da autorização, incluindo o recurso, a operação e o escopo permitido.

Estar autenticado não concede, por si só, acesso a dados médicos ou a operações de outro perfil.

## Usuários e responsabilidades

| Perfil                   | Responsabilidades documentadas                                                                                                                                                                           | Limite de atuação                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Paciente                 | Manter o próprio perfil e histórico, anexar documentos, registrar consultas, visualizar o histórico, compartilhar informações, conceder ou revogar acesso e consultar o histórico de acessos.            | Atua sobre os próprios dados e sobre as autorizações que concede. Não administra contas de terceiros nem altera dados médicos de outro paciente. |
| Profissional de Saúde    | Manter o próprio cadastro profissional, solicitar acesso, registrar atendimentos, adicionar documentos, consultar pacientes autorizados e atualizar informações médicas conforme a autorização recebida. | Atua somente sobre pacientes, dados e operações incluídos em uma autorização ativa. Não concede autorização em nome do paciente.                 |
| Administrador ou Suporte | Fora do escopo atual, conforme DS01 das [decisões de segurança](decisoes-de-seguranca.md). | Não recebe permissões. Qualquer inclusão exige decisão registrada e atualização desta matriz. |

## Matriz de permissões

As permissões abaixo são limitadas pelo recurso indicado e pela autorização do paciente quando a operação envolve dados médicos. “Próprio” significa o cadastro ou os dados do usuário autenticado. “Autorizado” significa que existe uma autorização ativa, não expirada e não revogada para o paciente e o escopo da operação.

| Funcionalidade                            | Paciente                                             | Profissional de Saúde                                                   | Administrador ou Suporte |
| ----------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------ |
| Criar conta de paciente                   | Permitido para a própria conta                       | Proibido                                                                | Fora do escopo           |
| Criar conta profissional                  | Proibido                                             | Permitido para a própria conta, pendente de validação DS02              | Fora do escopo           |
| Fazer login                               | Permitido na própria conta                           | Permitido na própria conta                                              | Fora do escopo           |
| Editar perfil                             | Permitido no próprio perfil                          | Permitido no próprio perfil profissional                                | Fora do escopo           |
| Anexar exames, receitas, laudos e imagens | Permitido nos próprios registros                     | Permitido dentro da autorização ativa e da operação `anexar`            | Fora do escopo           |
| Registrar consulta                        | Permitido no próprio histórico                       | Permitido dentro da autorização ativa e da operação `anexar`            | Fora do escopo           |
| Visualizar histórico médico               | Permitido no próprio histórico                       | Permitido dentro da autorização ativa e da operação `consultar`         | Fora do escopo           |
| Compartilhar informações                  | Permitido, dentro do próprio controle de autorização | Proibido conceder acesso em nome do paciente                            | Fora do escopo           |
| Solicitar acesso a paciente               | Proibido como profissional                           | Permitido após validação da conta profissional                           | Fora do escopo           |
| Consultar paciente                        | Permitido nos próprios dados                         | Permitido somente para paciente autorizado                              | Fora do escopo           |
| Atualizar informações médicas             | Permitido apenas em dados criados pelo próprio paciente | Permitido dentro da autorização ativa e da operação `atualizar`       | Fora do escopo           |
| Revogar acesso de profissional            | Permitido para autorizações do próprio paciente      | Proibido                                                                | Fora do escopo           |
| Consultar histórico de acessos            | Permitido no próprio histórico                       | Proibido consultar o histórico de outro usuário                         | Fora do escopo           |
| Alterar perfis ou permissões de terceiros | Proibido                                             | Proibido                                                                | Fora do escopo           |

### Restrições por ativo

- **A01 e A02 — dados pessoais:** cada perfil pode editar somente o próprio cadastro, conforme a funcionalidade documentada.
- **A03 a A05 e A12 — dados e documentos médicos:** o paciente controla o próprio conteúdo. O profissional precisa de autorização ativa e não pode consultar dados fora do escopo autorizado.
- **A06 e A07 — credenciais e tokens:** são usados para autenticação, recuperação ou confirmação de operações. Nenhum perfil recebe permissão para consultar ou alterar credenciais ou tokens de outra pessoa.
- **A08 — registros de auditoria:** o paciente pode consultar o próprio histórico de acessos. A alteração ou exclusão de registros não é permitida aos perfis documentados.
- **A09 a A11 — API, banco de dados e servidor:** são componentes internos protegidos. Pacientes e profissionais usam as funcionalidades expostas pelo sistema, não acesso administrativo direto a esses componentes.

## Operações proibidas

Para evitar permissões contraditórias, as seguintes operações não são concedidas aos perfis documentados:

- paciente acessar ou alterar dados médicos de outro paciente;
- profissional consultar ou atualizar dados de paciente sem autorização ativa, após a expiração ou após a revogação;
- profissional conceder, ampliar ou revogar autorização em nome do paciente;
- qualquer paciente ou profissional alterar seu próprio perfil para obter outro perfil;
- qualquer perfil acessar credenciais, tokens, banco de dados, servidor ou registros de auditoria de forma administrativa;
- qualquer perfil alterar a autorização apenas modificando um identificador enviado pelo cliente.

As verificações devem ocorrer no componente que controla o recurso. Ocultar uma funcionalidade na interface não substitui a autorização no servidor.

## Decisões aplicadas

DS01–DS07 das [decisões de segurança](decisoes-de-seguranca.md) resolvem o escopo administrativo, a atualização pelo paciente, a granularidade de autorização, a validação profissional e a recuperação de conta. A implementação dessas decisões ainda exige código e evidência.
