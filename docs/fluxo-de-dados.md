# Fluxo de dados e fronteiras de confiança (Issue #22)

## Status

Este diagrama e esta descrição são **propostos**, a partir dos componentes já documentados em [componentes do sistema](componentes-do-sistema.md) e dos [pontos de interação](pontos-de-interacao.md). O VitaLink não possui implementação executável (ver [Etapa 4](etapa4-codigo-seguro.md)), portanto o diagrama representa o comportamento pretendido, não um fluxo observado em execução.

Este artefato complementa, sem substituir, o [diagrama de arquitetura segura](etapa3-arquitetura-segura.md) da Etapa 3: aquele mostra a arquitetura de componentes e onde os controles (RS01–RS09) se aplicam; este mostra especificamente **como o dado circula**, com cada fluxo numerado e ligado às ameaças STRIDE da Etapa 1.

## Arquivos do diagrama

| Artefato | Caminho | Situação |
| --- | --- | --- |
| Fonte editável (Draw.io) | [`diagramas/fluxo-dados.drawio`](diagramas/fluxo-dados.drawio) | Presente — abrir em <https://app.diagrams.net> ou no aplicativo desktop do draw.io |
| Fonte alternativa (Mermaid) | [`diagramas/fluxo-dados.mmd`](diagramas/fluxo-dados.mmd) | Presente — mesma informação, formato de texto simples, útil como referência rápida sem abrir o draw.io |
| Imagem (`fluxo-dados.png`) | [`diagramas/fluxo-dados.png`](diagramas/fluxo-dados.png) | Presente — 4900×1520px, renderizada a partir da fonte Mermaid exata acima (ver método de geração abaixo) |

> **Como a imagem foi gerada:** não havia Node.js/`npx`/`mmdc` nem o aplicativo Draw.io disponíveis neste ambiente. A imagem foi produzida renderizando a fonte Mermaid exata de `fluxo-dados.mmd` em uma página HTML local com a biblioteca `mermaid.js`, capturada via Microsoft Edge em modo headless (`msedge --headless --virtual-time-budget=8000 --window-size=2450,760 --force-device-scale-factor=2 --screenshot=...`), resultando em uma imagem de 4900×1520px (fator de escala 2×). O conteúdo do `.mmd` não foi alterado para esse fim. O arquivo `.drawio` continua sendo a fonte editável de referência caso se prefira ajustar o layout manualmente no draw.io; ele foi validado como XML bem formado, mas seu layout visual não foi conferido em um aplicativo Draw.io real.

## Fronteiras de confiança

| Zona | Componentes | Observação |
| --- | --- | --- |
| Fora da fronteira de confiança (cliente) | Paciente, Profissional de Saúde, Aplicação Web | A interface não decide autorização; qualquer verificação feita apenas aqui pode ser contornada. |
| Fronteira de confiança (servidor/API) | API REST, Serviço de Autenticação, Decisão de Autorização, Registro de Auditoria | Toda requisição cruza esta fronteira pela API antes de tocar em dado médico. É aqui que RS01–RS03 (Etapa 3) são aplicados. |
| Dados (persistência) | Banco de Dados, Armazenamento de Documentos | Nunca acessados diretamente pelo cliente; apenas pela API, dentro da fronteira de confiança. |

A travessia entre a zona do cliente e a zona do servidor (aresta `HTTPS`, no diagrama) é o ponto único onde toda decisão de autenticação e autorização deve ocorrer — nenhum fluxo contorna essa fronteira.

## Fluxos de dados numerados

| ID | Fluxo | Origem → Destino | Dado transportado | Fronteira cruzada | Ameaças STRIDE relacionadas |
| --- | --- | --- | --- | --- | --- |
| F1 | Solicitação de acesso | Profissional → API → Decisão de Autorização | Identificador do profissional e do paciente-alvo | Cliente → Servidor | T01, T03 |
| F2 | Concessão de autorização | Paciente → API → Decisão de Autorização | Escopo, operações e período concedidos | Cliente → Servidor | T04, T06 |
| F3 | Consulta autorizada | Profissional → API → Banco de Dados / Armazenamento | Dado médico ou documento solicitado | Cliente → Servidor → Dados | T04, T05, T06, T11 |
| F4 | Upload de documento | Paciente ou Profissional → API → Armazenamento (arquivo) e Banco (metadados) | Arquivo do exame/laudo/receita e seus metadados | Cliente → Servidor → Dados | T07, T14 |
| F5 | Revogação de acesso | Paciente → API → Decisão de Autorização | Instrução de encerramento da autorização | Cliente → Servidor | T05 |
| F6 | Registro de auditoria | API → Registro de Auditoria (para cada um dos fluxos F1–F5) | Ator, alvo, operação, resultado e horário, sem segredo | Interno ao servidor | T09, T12 |

O fluxo geral de circulação de dados médicos entre usuários, aplicação, API, banco e armazenamento (requisito 1 da Issue #22) corresponde à composição de F1–F6: todo acesso a dado médico passa necessariamente por solicitação ou consulta (F1/F3), é condicionado por uma decisão de autorização vigente (F2/F5) e gera evidência auditável (F6).

## Como o diagrama apoia a análise STRIDE

Cada fluxo numerado cruza a fronteira de confiança em um ponto específico, o que permite perguntar, para cada um, "o que pode dar errado nesta travessia":

- **F1/F2/F5** (fluxos de solicitação, concessão e revogação): se a API não reavaliar o estado a cada acesso, um ataque de *Elevation of Privilege* ou *Information Disclosure* pode manter acesso após revogação — já modelado como T05.
- **F3** (consulta autorizada): se a API confiar em um identificador enviado pelo cliente sem checar a autorização correspondente, ocorre *Information Disclosure*/*Elevation of Privilege* — T04, T06.
- **F4** (upload): se a API não validar autoria e integridade, ocorre *Tampering* — T07; se não limitar tamanho/quota, ocorre *Denial of Service* — T14.
- **F6** (auditoria): se o evento não for gerado ou puder ser alterado pelo autor, ocorre *Repudiation* — T09, T12.

Esta tabela não cria ameaças novas: ela aponta, para cada ameaça já registrada na [Etapa 1](etapa1-modelagem-de-ameacas.md), em qual fluxo numerado do diagrama ela se manifesta — reforçando a rastreabilidade entre modelagem de ameaças e arquitetura.

## Relação com os demais artefatos

- Os componentes usados aqui (API, Autenticação, Autorização, Banco, Armazenamento, Auditoria, Notificação) são os mesmos descritos em [componentes do sistema](componentes-do-sistema.md) e no [diagrama de arquitetura segura](diagramas/arquitetura-segura.mmd) da Etapa 3.
- Os pontos de entrada e saída (cadastro, upload, consulta, compartilhamento) já documentados em [pontos de interação](pontos-de-interacao.md) correspondem aos mesmos fluxos aqui numerados.
- F1, F2, F3 e F5 correspondem às transições descritas em [fluxo de autorização e revogação](fluxo-autorizacao-revogacao.md) (estados `Solicitada`, `Ativa`, `Revogada`, `Expirada`).
