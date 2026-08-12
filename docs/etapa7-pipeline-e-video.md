# Etapa 7 — Pipeline e roteiro do vídeo final

## Estado do pipeline

Não há configuração de pipeline versionada entre os arquivos rastreados. Assim, não há execução, status ou evidência de integração contínua a declarar. O pipeline abaixo é um roteiro proposto, não uma configuração ativa.

| Ordem | Verificação proposta | Artefato de evidência esperado |
| ---: | --- | --- |
| 1 | Formatar e verificar Markdown. | Saída do formatador/verificador. |
| 2 | Executar testes de segurança da Etapa 4. | Resultado de teste por requisito. |
| 3 | Executar a verificação de segurança da Etapa 5. | Relatório ou saída versionada. |
| 4 | Publicar somente artefatos sem segredos. | Lista de artefatos e revisão. |

## Roteiro do vídeo final

1. Apresentar o escopo: paciente controla o histórico e o acesso profissional.
2. Mostrar ativos, CIA, perfis e autorização/revogação.
3. Mostrar STRIDE, casos de abuso e riscos priorizados.
4. Mostrar requisitos e decisões propostas no diagrama da Etapa 3.
5. Mostrar código, testes e verificação **somente se existirem evidências versionadas**.
6. Mostrar resposta a incidentes, regras de detecção, lacunas e risco residual esperado.
7. Mostrar histórico Git e participação individual, incluindo lacunas de autoria.

## Correspondência com o repositório

| Tema no vídeo | Artefato local |
| --- | --- |
| Ativos e CIA | [inventário](inventario-de-ativos.md), [CIA](classificacao-cia-dos-ativos.md) |
| Acesso | [perfis](usuarios-perfis-e-permissoes.md), [fluxo](fluxo-autorizacao-revogacao.md) |
| Etapas 1 e 2 | [ameaças](etapa1-modelagem-de-ameacas.md), [riscos](etapa2-riscos-e-tratamento.md) |
| Etapa 3 | [arquitetura](etapa3-arquitetura-segura.md), [diagrama](diagramas/arquitetura-segura.mmd) |
| Etapas 4 a 6 | [código seguro](etapa4-codigo-seguro.md), [verificação](etapa5-verificacao-de-seguranca.md), [resposta](etapa6-resposta-e-deteccao.md) |

Nenhum vídeo final nem execução de pipeline foi encontrado; sua evidência permanece **[A confirmar]**.
