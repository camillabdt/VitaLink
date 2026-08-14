# Implementação da issue #59 — resultados estruturados

## Estado e limite da entrega

Esta fatia permite registrar manualmente resultados confirmados e consultar histórico e evolução gráfica. Cada registro mantém valor, unidade, data, origem e intervalo de referência. A classificação se limita a “abaixo”, “dentro” ou “acima” do intervalo, sem diagnóstico ou prioridade clínica.

## Jornada executável

1. `POST /api/v1/clinical-results` exige todos os campos essenciais e confirmação explícita antes de persistir.
2. `GET /api/v1/clinical-results` retorna somente versões atuais e confirmadas dentro do escopo reavaliado.
3. `PATCH /api/v1/clinical-results/{id}` recebe a versão vista, motivo e novos valores, preserva origem e autoria e cria uma sucessora ligada por `replaces_id`.
4. A interface de importação oferece linhas manuais removíveis e envia os resultados somente após validar o conjunto completo.
5. As abas “Histórico” e “Evolução” usam a API. Os gráficos agrupam pelo par exame e unidade, sem converter nem misturar medidas incompatíveis.

## Controles verificáveis

- paciente proprietário ou profissional com autorização ativa para a categoria `exames` e a operação exigida;
- confirmação literal obrigatória, números finitos, textos não vazios e intervalo de referência ordenado;
- bloqueio pessimista e versão esperada para impedir duas correções da mesma versão;
- autoria e origem originais preservadas nas correções;
- versões anteriores mantidas no banco e ausentes da listagem corrente;
- separação de séries por unidade e estados de vazio, um ponto e múltiplas séries;
- auditoria de criação, consulta, correção, conflito e negação sem valor, nome do exame ou origem.

## Interface conectada

`ClinicalResultForm` substitui a extração simulada por entrada manual confirmada na jornada de exames. `ClinicalResults` reutiliza a mesma resposta persistida na tabela de histórico e nos gráficos Recharts. A correção é explícita, exige justificativa e atualiza a versão exibida. Não há OCR, interpretação automática, diagnóstico, alerta ou recomendação clínica.

## TDD e verificação

O primeiro teste público falhou com `404` antes da criação das rotas e da migração. A implementação mínima acrescentou armazenamento versionado, autorização por operação e os dois componentes de interface.

| Suíte | Cobertura desta issue                                                                 |
| ----- | ------------------------------------------------------------------------------------- |
| TS03  | propriedade e escopo profissional por `consultar`, `anexar` e `atualizar`;            |
| TS04  | confirmação, intervalo válido, versão sucessora e preservação de origem e autoria;    |
| TS06  | eventos de sucesso e negação sem conteúdo clínico;                                    |
| TS08  | formulário manual, validação, remoção de linha, correção, vazio e séries por unidade. |

Em 14 de agosto de 2026, a validação final executou Ruff, 65 testes backend, consistência Alembic, TypeScript, 39 testes frontend em dez arquivos, formatação e build de produção. O serviço web reconstruído ficou saudável. A inspeção visual manual não foi executada porque nenhum navegador integrado estava conectado à sessão; os testes de componente cobriram registro confirmado, histórico, correção, gráfico, vazio e separação por unidade.
