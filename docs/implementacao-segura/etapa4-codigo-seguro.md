# Etapa 4 — Práticas de código seguro e evidências

## Estado atual

O VitaLink possui implementação executável no backend FastAPI e no frontend React. Os controles abaixo foram conferidos no código e possuem testes automatizados. A implementação não comprova, por si só, redução de risco em produção: DAST do VitaLink, monitoramento centralizado e validação humana do HEAD atual permanecem pendentes.

## Práticas implementadas

| ID   | Prática                                                                                           | Evidência principal                                                                                 | Estado                                             |
| ---- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| CS01 | Reavaliar autorização no servidor em cada operação protegida.                                     | `active_authorization()` em `src/vitallink/main.py`; `tests/test_authorization_revocation.py`       | Implementado e testado                             |
| CS02 | Vincular paciente, profissional, categoria e operação sem confiar no cliente.                     | `authorized_document_patient()` e rotas de pacientes/documentos; testes de IDOR                     | Implementado e testado                             |
| CS03 | Negar por padrão e registrar a tentativa com resposta pública segura.                             | `authorization_change_denied()` e eventos `AuditEvent`                                              | Implementado e testado                             |
| CS04 | Separar criação da conta profissional de sua validação manual auditada.                           | `src/vitallink/professional_validation.py`; `tests/test_professional_registration.py`               | Implementado e testado                             |
| CS05 | Proteger credenciais e sessões com Argon2, TOTP, cookies opacos, CSRF e invalidação.              | rotas de conta e sessão; testes de cadastro, recuperação, sessão e limites                          | Implementado e testado no backend                  |
| CS06 | Preservar autoria e versões por correção, sem sobrescrever silenciosamente o histórico clínico.   | modelos e rotas de resultados, metas, mensagens, registros e observações                            | Implementado e testado                             |
| CS07 | Persistir auditoria append-only com identificadores pseudonimizados e projeção mínima ao usuário. | `audit_identifier()`, `AuditEvent`; `tests/test_notifications_audit.py`                             | Implementado e testado                             |
| CS08 | Manter documentos em armazenamento privado, sem link público ou coordenada física na resposta.    | `src/vitallink/document_storage.py`; `tests/test_documents.py`                                      | Implementado; integração depende de MinIO e ClamAV |
| CS09 | Limitar autenticação, recuperação, transcrição e carga controlada.                                | controles em `src/vitallink/main.py`; `tests/test_rate_limits.py` e `tests/test_controlled_load.py` | Implementado; correlação D01–D08 ainda não ativa   |
| CS10 | Validar assinatura, MIME, extensão, tamanho, quota e malware antes de liberar upload.             | `create_document()`; `tests/test_documents.py`                                                      | Implementado; integração depende de MinIO e ClamAV |

As evidências detalhadas por fatia estão no [índice de implementação segura](README.md).

## Trechos reais de código

### Autorização reavaliada no servidor

O servidor consulta a autorização persistida usando todos os elementos do escopo. Ausência de correspondência resulta em negação.

```python
return session.scalar(
    select(Authorization).where(
        Authorization.professional_id == professional_id,
        Authorization.patient_id == patient_id,
        Authorization.status == "active",
        Authorization.starts_at <= now,
        Authorization.expires_at > now,
        Authorization.categories.contains([category]),
        Authorization.operations.contains([operation]),
    )
)
```

Fonte: `src/vitallink/main.py`, função `active_authorization()`.

### Upload validado antes do armazenamento aprovado

O backend identifica o conteúdo por assinatura, compara MIME e extensão e aplica tamanho, quota e categoria permitida antes de enviar o arquivo à quarentena.

```python
invalid_upload = (
    not content
    or len(content) > settings.document_max_bytes
    or detected_type is None
    or file.content_type != detected_type
    or not original_name.casefold().endswith(expected_extensions)
    or category not in {"exames", "laudos", "receitas", "imagens"}
)
```

Após essa validação, o arquivo permanece em quarentena até o resultado do ClamAV. Somente arquivos limpos são promovidos ao bucket aprovado.

## Casos de teste

| ID   | Cenário                                                 | Resultado esperado                                            | Evidência atual                                               |
| ---- | ------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| CT01 | Profissional consulta paciente sem autorização ativa.   | Negação segura e evento de auditoria.                         | Coberto por testes de autorizações e pacientes.               |
| CT02 | Sessão profissional é reutilizada após revogação.       | Novo acesso negado imediatamente.                             | `tests/test_authorization_revocation.py`                      |
| CT03 | Cliente altera identificador de paciente ou documento.  | Recurso de outro titular não é revelado.                      | Testes de pacientes e documentos.                             |
| CT04 | Profissional não validado tenta solicitar acesso.       | Solicitação rejeitada.                                        | `tests/test_professional_registration.py`                     |
| CT05 | Usuário tenta escrita clínica fora do escopo.           | Operação negada e auditada.                                   | Testes de resultados, metas e registros profissionais.        |
| CT06 | Acesso sem sessão ou autorização tenta obter documento. | Conteúdo não é entregue.                                      | `tests/test_documents.py`                                     |
| CT07 | Cliente excede limite de requisições.                   | Resposta controlada e evento mínimo.                          | `tests/test_rate_limits.py` e `tests/test_controlled_load.py` |
| CT08 | Upload excede limite, quota ou usa tipo inconsistente.  | Rejeição anterior à liberação.                                | `tests/test_documents.py`                                     |
| CT09 | Operação crítica é executada.                           | Evento contém campos mínimos sem segredo ou conteúdo clínico. | `tests/test_notifications_audit.py`                           |
| CT10 | Informação versionada precisa ser recuperada.           | Versão anterior ou backup permanece recuperável.              | Testes de correções e `tests/test_backup_restore.py`          |

## Limites da comprovação

- A execução local de 14 de agosto de 2026 apresentou instabilidade na suíte frontend; o CI da candidata aprovou todas as verificações, conforme a [Etapa 5](etapa5-verificacao-de-seguranca.md).
- O ZAP versionado analisou o OWASP Juice Shop, não o VitaLink.
- D01–D08 continuam regras propostas, sem SIEM, correlação ou alertas ativos.
- A decisão humana de promoção foi vinculada ao conteúdo executável de `b80f410`; o commit documental posterior apenas registra essa evidência.
