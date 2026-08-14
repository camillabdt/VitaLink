# Implementação da issue #56 — revogação e expiração imediatas

## Estado e limite da entrega

Esta fatia permite ao paciente reduzir ou revogar uma autorização existente com TOTP adicional. Cada operação profissional continua autenticada pela sessão, mas consulta o estado, o escopo e o prazo atuais no PostgreSQL antes de devolver dados. Os recursos clínicos foram entregues nas issues posteriores e permanecem fora do escopo histórico desta evidência.

## Jornada executável

1. O paciente consulta as próprias autorizações em `GET /api/v1/authorizations`, com estado textual ativo, revogado ou expirado.
2. `PATCH /api/v1/authorizations/{id}` aceita somente um subconjunto não vazio das categorias e operações vigentes.
3. `POST /api/v1/authorizations/{id}/revocations` encerra imediatamente a autorização pertencente ao paciente.
4. Redução e revogação exigem justificativa e confirmação TOTP vinculada à conta, à sessão, à ação, ao prazo de cinco minutos e ao uso único.
5. A versão anterior é preservada em `authorization_revisions`; a autorização corrente, a auditoria e a notificação do profissional são persistidas na mesma transação.
6. A próxima listagem ou leitura profissional reavalia a autorização. A leitura usa bloqueio de linha para serializar a decisão com redução ou revogação concorrente.

## Controles verificáveis

- somente o paciente proprietário encontra e altera a autorização;
- redução não amplia categoria nem operação e não aceita escopo vazio;
- revogação repetida e redução idêntica são idempotentes e não duplicam histórico;
- autorização revogada ou expirada desaparece da lista profissional e o detalhe devolve a mesma resposta genérica usada para identificadores desconhecidos;
- tentativa de leitura após revogação ou expiração registra a regra D02 sem conteúdo clínico, TOTP ou sessão;
- a interface profissional revalida a lista quando a página volta ao foco ou fica visível e remove detalhe previamente carregado quando o acesso deixa de existir;
- não há cache de decisão, temporizador, `mockData` nem estado local usado como autoridade.

## Interface conectada

Em “Acesso temporário”, o paciente vê o estado textual de cada autorização ativa, informa motivo e TOTP e confirma a revogação. Após sucesso, o cartão muda para “Autorização revogada” e deixa de contar como compartilhamento ativo. A tela profissional revalida a lista pelo servidor ao retornar à página e descarta qualquer detalhe cujo paciente não esteja mais autorizado.

## TDD e verificação

Os ciclos RED→GREEN começaram pela rejeição das ações `authorization_revoke` e `authorization_reduce` no step-up. Em seguida, os testes públicos comprovaram revogação na mesma sessão, redução de escopo, idempotência, histórico único, expansão proibida, expiração, D02 e descarte de conteúdo profissional após revalidação.

| Suíte | Cobertura desta issue                                                               |
| ----- | ----------------------------------------------------------------------------------- |
| TS03  | propriedade, escopo mínimo, expansão proibida, estado, prazo e negação imediata;    |
| TS06  | histórico imutável, auditoria de mudança e alerta D02 após revogação ou expiração;  |
| TS08  | confirmação acessível, estado textual e limpeza da lista e do detalhe profissional. |

Em 14 de agosto de 2026, Ruff e a suíte backend completa passaram. A interface passou em formatação, TypeScript, 29 testes em sete arquivos e build de produção. A consistência Alembic e as auditorias de dependências também passaram. No navegador, um par sintético confirmou o detalhe antes da revogação, o estado revogado para o paciente e a lista vazia para o profissional. Não houve erro de console nem rolagem horizontal em 390 × 844, 768 × 1024 e 1440 × 900.
