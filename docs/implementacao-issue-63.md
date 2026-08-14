# Implementação da issue #63 — ditado clínico local

## Estado e limite da entrega

Esta fatia adiciona ditado somente aos textos clínicos livres de consultas, recomendações, metas, correções e mensagens. A API devolve um rascunho editável e não persiste texto nem áudio. A escrita clínica continua separada e exige a confirmação já definida pelo respectivo fluxo.

## Jornada executável

1. O profissional aciona `Iniciar ditado` e o navegador solicita permissão explícita para o microfone.
2. `MediaRecorder` mantém os fragmentos somente em memória, permite cancelar e encerra a gravação em até 120 segundos.
3. `POST /api/v1/transcriptions` revalida sessão, CSRF, perfil, paciente, categoria, operação, tipo, tamanho e duração.
4. Um processo isolado usa `Systran/faster-whisper-small` em CPU `int8`, idioma `pt` e revisão imutável `536b0662742c02347bc0e980a01041f333bce120`.
5. A API devolve `requires_confirmation: true`; o campo permanece editável e somente o formulário clínico existente pode persistir o texto revisado.

Digitação permanece disponível durante toda a jornada. O controle não aparece em credenciais, identificadores, busca, filtros nem justificativas administrativas.

## Privacidade e descarte

- o arquivo temporário recebe modo `0600` dentro de diretório `0700`;
- sucesso, áudio inválido, falha do modelo e timeout convergem para remoção no bloco `finally`;
- cancelamento no navegador descarta os fragmentos sem fazer requisição;
- timeout encerra e aguarda o processo filho;
- auditoria registra resultado, correlação, papel e alvo pseudonimizado, sem áudio ou texto;
- `HF_HUB_DISABLE_TELEMETRY=1` e `DO_NOT_TRACK=1` desabilitam telemetria;
- o Compose mantém somente o modelo fixado no volume `whisper-models`, nunca os áudios.

## TDD e verificação

O RED inicial registrou a ausência do componente público `ClinicalDictation`. O GREEN mínimo cobriu permissão explícita, rascunho sem persistência e cancelamento sem upload. O ciclo da API cobriu perfil indevido, escopo incorreto, formato inválido, limite de 120 segundos, timeout, falha do modelo e diretório temporário vazio.

| Suíte | Cobertura desta issue                                                                   |
| ----- | --------------------------------------------------------------------------------------- |
| TS06  | sucessos e negações auditados sem conteúdo clínico, áudio ou segredo;                   |
| TS07  | permissão, formato, tamanho, duração, falha, timeout, cancelamento, rascunho e revisão; |
| TS08  | estados acessíveis, digitação alternativa e integração somente nos campos permitidos;   |
| TS10  | dependência travada, revisão imutável, CPU `int8`, volume e telemetria desabilitada.    |

Em 14 de agosto de 2026, a validação executou Ruff, 77 testes backend, consistência Alembic, TypeScript, 51 testes frontend em catorze arquivos, formatação, build de produção e validação do Compose. `pip-audit` e `pnpm audit --prod --audit-level high` não encontraram vulnerabilidades conhecidas. Uma transcrição real com o fixture público do projeto faster-whisper produziu rascunho não vazio, duração positiva e zero arquivos temporários; a saída registrou somente essas métricas.

A inspeção visual manual não foi repetida porque o navegador integrado continua bloqueado pelo certificado local autoassinado já documentado na #61. Nenhum desvio de TLS foi introduzido; componentes, nomes acessíveis, tipagem e build foram validados automaticamente.
