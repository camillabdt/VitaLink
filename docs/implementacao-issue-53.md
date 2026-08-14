# Implementação da issue #53 — perfis e configurações

## Estado e limite da entrega

Esta fatia conecta os perfis próprios de paciente e profissional ao PostgreSQL e reutiliza os fluxos existentes de troca de senha e gestão de sessões. Observações pessoais, profissionais autorizados, códigos temporários e histórico de acessos pertencem às issues que implementam esses domínios e não permanecem simulados nesta tela.

## Jornada executável

1. `GET /api/v1/me` identifica a conta pela sessão opaca e retorna somente o perfil pertencente ao usuário autenticado.
2. `PATCH /api/v1/me` exige `Origin`, CSRF e a versão previamente lida do perfil.
3. Paciente pode alterar nome, data de nascimento, telefone e tipo sanguíneo.
4. Profissional pode alterar telefone e instituição. Nome, e-mail, CPF, CRM, UF, especialidade, perfil e estado de validação não mudam pela edição comum.
5. Uma versão desatualizada recebe conflito e não sobrescreve a atualização persistida.
6. Configurações da barra lateral abre o perfil correto para paciente ou profissional. A aba Segurança usa os endpoints existentes de senha, TOTP e sessões.

## Controles verificáveis

- a consulta resolve o perfil pelo identificador da conta autenticada, sem aceitar identificador de perfil na rota;
- edição usa bloqueio de linha e controle otimista por versão;
- campos não editáveis, falha de CSRF e conflito produzem negação segura e auditada;
- eventos de auditoria registram apenas identificadores pseudonimizados, papel e nomes de campos, sem valores pessoais;
- frontend trata carregamento, falha transitória, sessão expirada, conflito e sucesso persistido;
- campos validados do profissional permanecem somente leitura na interface e na API.

## TDD e verificação

Os ciclos RED→GREEN começaram pela resposta persistida de `GET /api/v1/me`, seguiram pela edição do paciente, pela edição restrita do profissional, pela rota profissional de Configurações e pela restauração da sessão após recarregar. Os testes negativos cobrem campo imutável e conflito de versão. A refatoração ocorreu somente após as suítes afetadas ficarem verdes.

| Suíte | Cobertura desta issue                                                               |
| ----- | ----------------------------------------------------------------------------------- |
| TS02  | sessão opaca, CSRF e estado de sessão expirada;                                     |
| TS03  | propriedade do perfil, campos permitidos e negação de alteração de identidade;      |
| TS06  | sucesso, campo não editável, falha de verificação e conflito auditados sem valores; |
| TS08  | rotas distintas, dados persistidos, edição inline, estados e controles acessíveis.  |

Em 14 de agosto de 2026, `ruff check`, `pytest`, `pnpm format:check`, `tsc --noEmit`, `pnpm test` e `pnpm build` passaram localmente. A validação no navegador confirmou ausência de rolagem horizontal em 390 × 844, 768 × 1024 e 1440 × 900, edição persistida após recarregar e ausência de erros no console. O build manteve apenas os avisos preexistentes de configuração futura do Vite e tamanho de bundle.
