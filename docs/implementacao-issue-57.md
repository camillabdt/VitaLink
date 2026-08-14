# Implementação da issue #57 — observações pessoais

## Estado e limite da entrega

Esta fatia permite ao paciente criar, consultar e corrigir registros escritos sobre a própria saúde. A interface e a API usam o termo “observação pessoal” e identificam autoria do paciente. O recurso permanece separado de consulta, diagnóstico, recomendação e anotação profissional.

## Jornada executável

1. `POST /api/v1/personal-observations` cria a primeira versão com paciente e autor derivados da sessão.
2. `GET /api/v1/personal-observations` lista somente versões atuais pertencentes ao paciente autenticado.
3. `PATCH /api/v1/personal-observations/{id}` recebe o texto corrigido e a versão vista pelo paciente.
4. A correção bloqueia a versão atual, marca o registro anterior como histórico e cria um novo registro ligado por `replaces_id`.
5. Reutilizar uma versão substituída devolve conflito `409`; trocar o identificador por uma observação alheia devolve a mesma ausência usada para recurso desconhecido.

## Controles verificáveis

- somente o paciente proprietário cria, lista ou corrige;
- uma autorização clínica não concede ao profissional acesso a observações pessoais;
- texto vazio ou composto apenas por espaços é rejeitado e o limite é 4.000 caracteres;
- a versão anterior, autoria original e data original permanecem persistidas;
- `replaces_id` é único para impedir duas sucessoras da mesma versão;
- criação, listagem, correção, conflito, papel incorreto e acesso cruzado são auditados sem incluir o texto, nome, CPF, e-mail, sessão ou token;
- escritas exigem sessão, origem permitida e CSRF vinculado ao cookie.

## Interface conectada

O componente `PersonalObservations` é reutilizado na aba “Observações pessoais” do perfil e na aba “Histórico” do painel do paciente. Ele cobre carregamento, vazio, validação, sucesso persistido, correção, conflito, falha e sessão expirada. Cada cartão informa “Escrita por você”, data e versão.

A antiga aba “Consultas” e seu formulário local foram removidos do painel do paciente. O paciente não escolhe médico nem registra consulta, diagnóstico ou anotação profissional por essa jornada.

## TDD e verificação

Os ciclos RED→GREEN começaram com `404` na criação/listagem, depois `404` na correção e falha de resolução do componente ausente. Os testes públicos passaram a cobrir persistência, autoria, versão, conflito, histórico, acesso cruzado, profissional clinicamente autorizado, auditoria sem conteúdo, estado vazio, criação e correção pela interface.

| Suíte | Cobertura desta issue                                                                |
| ----- | ------------------------------------------------------------------------------------ |
| TS03  | propriedade, papel, acesso cruzado e autorização clínica sem efeito;                 |
| TS04  | correção cria nova versão, preserva proveniência e rejeita versão obsoleta;          |
| TS06  | auditoria de sucesso e negação sem conteúdo da observação;                           |
| TS08  | carregamento, vazio, criação, autoria textual, correção, conflito e sessão expirada. |

Em 14 de agosto de 2026, a validação final executou a suíte backend completa, Ruff, consistência Alembic, auditorias de dependências, formatação, TypeScript, 32 testes frontend em oito arquivos e build de produção. No navegador, a paciente sintética criou a versão 1 no perfil, corrigiu para a versão 2 e encontrou a mesma versão pelo destino lateral “Histórico”. Não houve erro de console nem rolagem horizontal em 390 × 844, 768 × 1024 e 1440 × 900.
