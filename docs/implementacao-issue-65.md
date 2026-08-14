# Implementação da issue #65 — limites, backup e restauração

## Estado e limite da entrega

Esta fatia limita chamadas autenticadas da API por conta e origem resolvida pelo servidor, preserva as quotas de documentos e acrescenta backup e restauração verificável de PostgreSQL, objetos privados e auditoria. Não existe tela nova. Erros de limite e dependência reutilizam o contrato seguro da API, sem payload recebido, identidade, segredo ou conteúdo clínico.

## Limites e falha segura

- toda rota `/api/` com sessão autenticada usa uma janela fixa persistida no PostgreSQL e uma chave pseudonimizada de conta e origem;
- `VITALINK_API_RATE_LIMIT_REQUESTS` e `VITALINK_API_RATE_LIMIT_WINDOW_SECONDS` configuram o limite, com valores positivos obrigatórios;
- o excesso retorna `429`, `Retry-After`, código público `api_temporarily_limited` e evento `api.request.rate_limited` com motivo D03 e somente o papel da conta;
- outra conta na mesma origem mantém seu próprio limite;
- falha SQL durante a limitação ou a operação retorna `503 dependency_unavailable` e não confirma uma transação incompleta;
- as quotas configuráveis de arquivo e armazenamento por paciente permanecem aplicadas antes da promoção de um objeto aprovado.

## Backup e restauração limpa

`scripts/backup_restore.sh backup DIRETORIO` pausa a API, exige um diretório vazio, exporta o PostgreSQL em formato customizado, arquiva o volume privado de objetos e gera manifestos e checksums SHA-256. `scripts/backup_restore.sh verify DIRETORIO` verifica os artefatos e restaura tudo em um projeto Compose isolado, sem portas publicadas. A validação compara:

- contagem de todas as tabelas públicas;
- hash agregado de identificador, vínculo, chave, integridade e estado dos documentos;
- hash agregado dos eventos append-only de auditoria;
- quantidade e validade das chaves estrangeiras;
- caminho e SHA-256 de cada objeto privado.

O ensaio de 14 de agosto de 2026 usou exclusivamente uma origem sintética isolada com uma conta, um paciente, um documento, um evento de auditoria e um objeto de 23 bytes. A restauração ocorreu em outro projeto vazio e terminou com `clean restore verified: counts, hashes, objects, audit and foreign keys match`.

## Carga controlada

O comando abaixo usa somente biblioteca padrão, limita cada execução a 500 requisições e produz JSON com parâmetros, respostas, duração e vazão, sem registrar corpos:

```bash
python -m vitallink.controlled_load \
  --url http://localhost:8000/health \
  --requests 50 \
  --concurrency 5
```

Após o health check do Compose, o ensaio local reproduzível concluiu 50 requisições em 0,198601 segundo, com 50 respostas `200` e 251,761 requisições por segundo. Uma execução deliberadamente anterior ao estado saudável classificou as 50 respostas como `network_error`, sem contá-las como sucesso.

## TDD e verificação

O primeiro RED do limite falhou porque a configuração ainda não existia. O primeiro RED do backup falhou porque o comando ainda não existia. O RED da carga falhou com `No module named vitallink.controlled_load`. Cada comportamento recebeu sua implementação mínima antes do GREEN. O teste público de atomicidade também passou a exigir `503` e rollback quando o PostgreSQL rejeita o evento de auditoria.

| Suíte | Cobertura desta issue                                                                                |
| ----- | ---------------------------------------------------------------------------------------------------- |
| TS05  | limite e quota de documentos permanecem cobertos com MinIO e ClamAV reais;                           |
| TS06  | excesso D03 minimizado, correlação e rollback quando a auditoria obrigatória falha;                  |
| TS09  | limite por conta/origem, falha segura, carga reproduzível e restauração sintética em ambiente limpo; |
| TS10  | imagens fixadas, configuração validada, checksums, Compose isolado e gates de CI;                    |

Em 14 de agosto de 2026, a validação executou formatação e Ruff, 86 testes backend, auditoria Python sem vulnerabilidades conhecidas, consistência Alembic, backup e restauração sintéticos reais, carga controlada no contêiner saudável, configuração dos dois arquivos Compose, formatação frontend, auditoria Node sem vulnerabilidades conhecidas, 56 testes frontend em dezesseis arquivos e build de produção.
