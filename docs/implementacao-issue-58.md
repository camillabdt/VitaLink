# Implementação da issue #58 — documentos privados

## Estado e limite da entrega

Esta fatia conecta upload, listagem, visualização e download de documentos PDF, JPG e PNG. Os objetos permanecem em armazenamento S3 privado. Não existem link público, DICOM, OCR, extração automática nem progresso simulado.

## Jornada executável

1. `POST /api/v1/documents` recebe arquivo e categoria por `multipart/form-data`, limita a leitura a 20 MB e deriva paciente e ator da sessão ou da autorização ativa.
2. A API valida nome, extensão, tipo declarado, assinatura e estrutura binária mínima, aplica a quota configurável de 200 MB e gera uma chave interna aleatória.
3. O objeto entra no bucket privado de quarentena e seus metadados são persistidos com estado `quarantine`.
4. A API envia os bytes ao ClamAV pelo protocolo `INSTREAM`. Falha do scanner ou da promoção mantém o documento indisponível na quarentena; detecção remove o objeto quando possível e marca o registro como rejeitado.
5. Somente o resultado limpo é copiado ao bucket privado aprovado. Cada listagem ou leitura reavalia propriedade, categoria, operação, estado e prazo.
6. `GET /api/v1/documents/{id}/content` entrega conteúdo aprovado com CSP restritiva e `nosniff`; download exige confirmação TOTP de uso único vinculada a `document_download`.
7. `GET /api/v1/documents/{id}/authorized-professionals` substitui compartilhamento por uma lista calculada das autorizações ativas que cobrem categoria e consulta.

## Controles verificáveis

- limite de 20 MB por arquivo e quota total de 200 MB por paciente, ambos configuráveis;
- nomes internos gerados no servidor e coordenadas de armazenamento ausentes das respostas;
- buckets distintos e privados para quarentena e aprovados, sem URL pública ou permanente;
- PDF, PNG e JPEG identificados por conteúdo, com coerência entre assinatura, extensão e tipo declarado;
- ClamAV obrigatório antes da disponibilização e falha segura quando scanner ou armazenamento não concluem o fluxo;
- integridade SHA-256 conferida novamente antes de cada entrega;
- paciente proprietário e profissional com autorização ativa por categoria e operação; troca de identificador não enumera recursos;
- visualização isolada e download com TOTP adicional;
- auditoria registra ator pseudônimo, recurso, operação, resultado e categoria, sem nome do arquivo, conteúdo, identidade pessoal ou segredo.

## Interface conectada

`DocumentUploadModal` envia o arquivo real e aceita somente PDF, JPG e PNG de até 20 MB. `DocumentViewerModal` usa a rota autenticada em um `iframe` com sandbox, mostra os profissionais atualmente autorizados e solicita TOTP para download. A aba “Documentos” do painel carrega metadados persistidos. `ImportExamPage` reutiliza o upload seguro e não contém documento de exemplo, OCR, resultados extraídos ou temporizadores artificiais.

## TDD e verificação

O primeiro teste público falhou com `404` e passou somente após a migração, o armazenamento privado e a varredura real. A suíte acumulada cobre arquivo limpo, extensão falsa, quota, falha do scanner, resposta infectada, IDOR, download com TOTP, reautorização profissional e upload com operação `anexar`.

| Suíte | Cobertura desta issue                                                                                                 |
| ----- | --------------------------------------------------------------------------------------------------------------------- |
| TS03  | propriedade, escopo profissional por categoria/operação, IDOR e reautorização por leitura;                            |
| TS05  | extensão falsa, assinatura real, limite, quota, scanner indisponível e amostra sintética classificada como infectada; |
| TS06  | eventos de upload, varredura, visualização, download e negação sem conteúdo do documento;                             |
| TS08  | upload real, estados de erro, lista persistida, visualização isolada e TOTP para download;                            |
| TS10  | MinIO e ClamAV reais no Compose, migração reproduzível e falha segura das dependências.                               |

Em 14 de agosto de 2026, a validação final executou Ruff, 61 testes backend, consistência Alembic, auditoria Python sem vulnerabilidades conhecidas, seis testes específicos contra PostgreSQL, MinIO e ClamAV reais, TypeScript, 34 testes frontend em nove arquivos, auditoria Node sem vulnerabilidades conhecidas e build de produção. No navegador, a paciente sintética listou e visualizou o PNG aprovado, encontrou a lista vazia de profissionais autorizados e concluiu o download com TOTP; API e navegador confirmaram respostas `200` para visualização/lista/download e `201` para a confirmação. Não houve erro de console nem rolagem horizontal em 390 × 844, 768 × 1024 e 1440 × 900.
