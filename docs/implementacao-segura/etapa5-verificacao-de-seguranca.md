# Etapa 5 — Verificação de segurança

## Estado da etapa

O VitaLink possui as fatias verticais da primeira versão executáveis. As evidências históricas estão registradas nas implementações das issues [#50](implementacao-issue-50.md) a [#65](implementacao-issue-65.md). A [issue #66](implementacao-issue-66.md) registra a revisão histórica e a decisão humana final de promoção vinculada ao conteúdo executável da candidata.

O diretório `VitaLink Health Management App/` contém a interface implementada. Os fluxos documentados nas issues estão conectados à API, exceto os trechos estáticos identificados no inventário.

## Validação atual do HEAD

Em 14 de agosto de 2026, os serviços PostgreSQL, Mailpit, MinIO e ClamAV foram iniciados pelo Docker Compose e as suítes foram repetidas localmente. Após a consolidação documental, o mesmo HEAD também foi validado pelo CI da `develop`:

| Ambiente                   | Backend               | Frontend                     | Observação                                                                                                                                                           |
| -------------------------- | --------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Execução local             | 86 aprovados, 1 aviso | 39 aprovados e 18 reprovados | Houve timeouts e asserções divergentes na execução frontend concorrente; dois arquivos de autenticação passaram isoladamente com um único worker.                    |
| CI da `develop`, `b80f410` | 86 aprovados, 1 aviso | 57 aprovados                 | O workflow [CI #31839376826](https://github.com/camillabdt/VitaLink/actions/runs/31839376826) também aprovou migrações, seed, Ruff, `pip-audit`, formatação e build. |

O gate automatizado da `develop` está verde. A divergência local permanece registrada como instabilidade do ambiente de execução, sem correção funcional nesta consolidação. Em 14 de agosto de 2026, a responsável autorizou explicitamente a promoção para `main` do conteúdo executável de `b80f410`. Uma nova inspeção pelo navegador integrado foi tentada, mas a ferramenta ficou indisponível; portanto, este registro não inventa novas capturas visuais. O DAST específico do VitaLink não compõe esta evidência.

## Estratégia TDD adotada para o VitaLink

A implementação seguirá TDD em fatias verticais. Cada ciclo seleciona um comportamento observável pela interface pública, produz um teste RED pelo motivo esperado, implementa o mínimo para GREEN e só então permite refatoração. A suíte cresce junto com cada issue; os testes de segurança não ficam adiados para uma fase final.

| ID   | Suíte                              | Cobertura mínima                                                                                                                            | Evidência exigida                                                       |
| ---- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| TS01 | Conta e identidade                 | Cadastro, confirmação, TOTP, login, recuperação, reautenticação e validação profissional, incluindo limites de tentativa.                   | Relatório com comportamento, resultado, duração e commit.               |
| TS02 | Sessão e requisição                | Cookie seguro, expirações, logout, invalidação, fixação, CSRF, `Origin`, enumeração e respostas seguras.                                    | Integração pela API e navegador com dados sensíveis removidos.          |
| TS03 | Autorização negativa               | Paciente, profissional, categoria, operação, estado e prazo; IDOR, acesso cruzado, redução, revogação e expiração imediatas.                | Matriz executada com casos permitidos e negados.                        |
| TS04 | Integridade clínica                | Criação, proveniência, confirmação, correção, imutabilidade, concorrência e proibição de exclusão de registros e mensagens.                 | Testes de integração demonstrando versões e autoria preservadas.        |
| TS05 | Upload hostil                      | Tipo real, extensão falsa, conteúdo ativo, malware, limite, quota, nomes maliciosos, falha do scanner, isolamento e autorização de leitura. | Corpus sintético seguro, resultados do ClamAV e descarte da quarentena. |
| TS06 | Auditoria e privacidade            | Sucesso e negação, atomicidade, append-only, correlação, minimização, log injection e ausência de segredos, PII, áudio e conteúdo clínico.  | Consultas de verificação e relatório sanitizado.                        |
| TS07 | Ditado clínico                     | Permissão negada, limite, formato, falha, descarte de áudio, rascunho, edição e confirmação explícita nos campos permitidos.                | Testes pela UI e integração com transcrição local real.                 |
| TS08 | Interface, visual e acessibilidade | Rotas e controles do inventário, estados assíncronos, persistência, teclado, foco, nomes acessíveis, contraste, zoom e viewports definidos. | Relatório E2E, acessibilidade e comparação visual sem dados reais.      |
| TS09 | Disponibilidade e recuperação      | Rate limiting, carga controlada, quota, falhas de dependências, reinício, backup, restauração e integridade de banco, objetos e auditoria.  | Métricas, comandos reproduzíveis e restauração sintética verificada.    |
| TS10 | Cadeia e configuração              | Dependências, imagens, segredos, análise estática, portas, TLS, cabeçalhos e permissões do ambiente.                                        | Relatórios das ferramentas com versão, parâmetros e triagem.            |

Testes de integração usarão os serviços reais do ambiente de desenvolvimento. Dublês ficam restritos a fronteiras externas inexistentes, tempo e aleatoriedade controlados. Todos os testes usarão apenas dados sintéticos. Os detalhes e portões de qualidade estão no [plano de implementação](plano-implementacao-primeira-versao.md).

Para tornar a etapa reproduzível e produzir evidência prática sem inventar resultados sobre o VitaLink, foi utilizado o **OWASP Juice Shop** como aplicação-alvo didática. A aplicação foi executada localmente em Docker e analisada com o **OWASP ZAP Baseline Scan**.

Os achados descritos nesta etapa pertencem ao ambiente testado — OWASP Juice Shop — e **não constituem evidência de vulnerabilidades existentes no VitaLink**. Eles são utilizados para demonstrar o processo de verificação, análise de resultados e relação com os controles planejados para o projeto.

## Ambiente testado

| Item                    | Configuração                           |
| ----------------------- | -------------------------------------- |
| Data da execução        | 13 de agosto de 2026                   |
| Aplicação-alvo          | OWASP Juice Shop                       |
| Imagem utilizada        | `bkimminich/juice-shop:latest`         |
| Execução                | Container Docker `vitalink-juice-shop` |
| Porta local             | `3000`                                 |
| Rede Docker             | `vitalink-security`                    |
| Ferramenta              | OWASP ZAP                              |
| Imagem do ZAP           | `ghcr.io/zaproxy/zaproxy:stable`       |
| Tipo de análise         | ZAP Baseline Scan                      |
| Alvo interno da análise | `http://vitalink-juice-shop:3000`      |

Antes da execução do ZAP, a disponibilidade da aplicação foi confirmada localmente e retornou:

```text
HTTP 200
```

## Procedimento executado

O diretório de evidências foi criado em:

```text
evidencias/etapa-5/
```

O Juice Shop foi executado em uma rede Docker dedicada e o ZAP foi conectado à mesma rede.

O comando utilizado para a varredura foi:

```bash
docker run --rm \
  --network vitalink-security \
  -v "$(pwd)/evidencias/etapa-5:/zap/wrk/:rw" \
  -t ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
  -t http://vitalink-juice-shop:3000 \
  -r zap-report.html \
  -J zap-report.json \
  -I
```

O ZAP Baseline realiza rastreamento da aplicação e análise passiva do tráfego observado. Nesta execução não foi realizada exploração ativa contra o alvo.

## Evidências produzidas

A execução gerou os seguintes artefatos:

- [Relatório HTML do ZAP](../../evidencias/etapa-5/zap-report.html)
- [Relatório JSON do ZAP](../../evidencias/etapa-5/zap-report.json)

O diretório também contém o arquivo `zap.yaml` produzido durante a execução do ZAP. Esse arquivo deve ser considerado artefato auxiliar da execução, não resultado de vulnerabilidade.

## Resumo da execução

O ZAP informou:

```text
Total of 88 URLs
FAIL-NEW: 0
FAIL-INPROG: 0
WARN-NEW: 8
WARN-INPROG: 0
INFO: 0
IGNORE: 0
PASS: 59
```

Portanto:

| Resultado                      | Quantidade |
| ------------------------------ | ---------: |
| URLs observadas                |         88 |
| Regras classificadas como PASS |         59 |
| Categorias WARN-NEW            |          8 |
| FAIL-NEW                       |          0 |
| FAIL-INPROG                    |          0 |

A ausência de `FAIL-NEW` **não significa ausência de vulnerabilidades**. O resultado descreve apenas o comportamento das verificações executadas pelo ZAP Baseline neste ambiente e nesta execução.

O relatório JSON detalha algumas categorias em alertas ou subtipos separados. Por isso, a quantidade de objetos de alerta no JSON não deve ser interpretada diretamente como substituta do resumo `WARN-NEW: 8` apresentado pelo processo de baseline.

## Alertas observados

Entre os alertas apresentados pela execução estavam:

- Content Security Policy (CSP) Header Not Set;
- Non-Storable Content;
- Deprecated Feature Policy Header Set;
- Timestamp Disclosure - Unix;
- Cross-Domain Misconfiguration;
- Modern Web Application;
- Dangerous JS Functions;
- Cross-Origin-Embedder-Policy Header Missing or Invalid.

O relatório JSON também apresenta detalhes relacionados a `Cross-Origin-Opener-Policy` e diferentes situações de cache associadas às regras correspondentes.

## Análise dos principais achados

Foram selecionados três resultados por apresentarem relação mais clara com práticas relevantes ao desenvolvimento seguro de uma aplicação que manipula informações sensíveis.

### A01 — Content Security Policy Header Not Set

**Regra ZAP:** `10038`
**Risco informado pelo ZAP:** Medium
**Confiança informada pelo ZAP:** High
**Ocorrências observadas:** 5

Foram identificadas respostas sem o cabeçalho `Content-Security-Policy`, incluindo a página principal da aplicação.

A Content Security Policy constitui uma camada adicional de proteção do navegador, permitindo restringir fontes autorizadas para scripts, estilos e outros recursos. Sua ausência não demonstra isoladamente a existência de XSS, mas reduz uma defesa adicional caso uma condição de injeção venha a existir.

**Tratamento recomendado:** definir uma política CSP compatível com a aplicação, restringindo origens e tipos de conteúdo necessários e evitando permissões excessivamente amplas.

**Relação com o VitaLink:** esse achado não possui correspondência direta com um único risco já catalogado no VitaLink. Entretanto, representa defesa em profundidade relevante para uma aplicação web que trata informações médicas. Em uma futura implementação, a configuração dos cabeçalhos de segurança deverá integrar a verificação técnica da aplicação.

### A02 — Cross-Domain Misconfiguration

**Regra ZAP:** `10098`
**Risco informado pelo ZAP:** Medium
**Confiança informada pelo ZAP:** Medium
**Ocorrências observadas:** 4

O ZAP registrou como evidência:

```text
Access-Control-Allow-Origin: *
```

A utilização irrestrita de `Access-Control-Allow-Origin: *` permite que qualquer origem seja considerada permitida para recursos aos quais essa política se aplique.

O impacto concreto depende do tipo de recurso, das credenciais utilizadas e da existência de dados sensíveis na resposta. Portanto, o alerta não deve ser interpretado automaticamente como vazamento comprovado.

**Tratamento recomendado:** limitar explicitamente as origens permitidas nos endpoints que necessitem de acesso entre origens e evitar políticas CORS excessivamente permissivas em recursos sensíveis.

**Relação com o VitaLink:** caso uma configuração equivalente fosse aplicada a endpoints de dados médicos, ela poderia ampliar situações relacionadas à exposição ou extração indevida de informações, aproximando-se dos riscos **R10 e R11**. A arquitetura proposta do VitaLink exige que acesso e compartilhamento permaneçam mediados pela API e sujeitos a controles de autorização.

### A03 — Dangerous JS Functions

**Regra ZAP:** `10110`
**Risco informado pelo ZAP:** Low
**Confiança informada pelo ZAP:** Low
**Ocorrências observadas:** 1

O alerta foi encontrado em:

```text
http://vitalink-juice-shop:3000/main.js
```

com a evidência:

```text
bypassSecurityTrustHtml(
```

Essa função permite que código Angular marque determinado conteúdo como confiável, contornando mecanismos normais de sanitização do framework.

A presença da função, isoladamente, não comprova uma vulnerabilidade explorável. O risco depende da origem e da forma como o conteúdo fornecido à função é construído.

**Tratamento recomendado:** evitar o uso da função com dados provenientes de usuários ou outras fontes não confiáveis. Quando seu uso for indispensável, a origem e sanitização dos dados devem ser avaliadas explicitamente.

**Relação com o VitaLink:** o catálogo atual de riscos não possui um risco específico para XSS. Esse resultado deve, portanto, ser tratado como uma preocupação complementar de implementação segura, e não artificialmente associado a um risco diferente apenas para completar a rastreabilidade.

## Alertas não selecionados para análise detalhada

Os demais resultados foram mantidos nos relatórios completos, mas não receberam análise individual nesta etapa.

Entre eles estão:

- `Non-Storable Content`;
- `Deprecated Feature Policy Header Set`;
- `Timestamp Disclosure - Unix`;
- `Modern Web Application`;
- `Cross-Origin-Embedder-Policy Header Missing or Invalid`;
- `Cross-Origin-Opener-Policy Header Missing or Invalid`;
- alertas informativos relacionados ao comportamento de cache.

A não seleção desses itens para a tabela principal não significa que sejam falsos positivos. A escolha apenas prioriza três resultados com maior utilidade para a discussão de práticas de desenvolvimento seguro.

## Relação com as etapas anteriores

A verificação prática reforça alguns princípios já definidos para o VitaLink:

| Resultado observado no ambiente didático          | Aplicação futura no VitaLink                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| CORS excessivamente permissivo                    | Restringir origens e manter autorização dos dados exclusivamente na API.            |
| Ausência de CSP                                   | Configurar cabeçalhos de segurança como defesa em profundidade da aplicação web.    |
| Uso de função JavaScript que contorna sanitização | Evitar APIs perigosas e validar dados antes da composição de conteúdo no navegador. |
| Alertas relacionados a políticas de navegador     | Incorporar configuração segura de cabeçalhos à revisão da aplicação implantada.     |

O achado A02 possui relação potencial com os riscos de exposição e extração indevida de dados **R10 e R11**. A01 e A03 são preocupações complementares que deverão ser consideradas na implementação mesmo sem correspondência direta com um risco específico do catálogo atual.

## Limitações

Esta verificação possui as seguintes limitações:

1. o sistema analisado foi o OWASP Juice Shop, e não o VitaLink;
2. o VitaLink possui aplicação executável local, mas ainda não há relatório DAST versionado contra ela;
3. o ZAP Baseline utiliza principalmente análise passiva e não substitui testes ativos, revisão de código ou testes de autorização;
4. os resultados descrevem somente a versão e a configuração observadas no momento da execução;
5. `PASS` significa apenas que determinada regra passiva não produziu alerta durante a execução, e não que o sistema esteja livre daquela classe de vulnerabilidade;
6. nenhuma conclusão sobre vulnerabilidades reais do VitaLink pode ser derivada diretamente desses achados.

## Conclusão

A Etapa 5 passa a possuir **evidência prática e reproduzível de um processo de verificação de segurança**, incluindo ambiente controlado, ferramenta, comando executado, relatórios e análise de achados.

A execução do ZAP descrita nesta seção não valida a segurança do VitaLink, pois teve o OWASP Juice Shop como alvo didático. Ela demonstra a aplicação do processo de análise e estabelece como resultados de ferramentas devem ser interpretados sem confundir ameaça, vulnerabilidade, alerta automatizado e vulnerabilidade comprovada. A implementação do VitaLink é sustentada separadamente por código, testes e evidências históricas das issues #50 a #66. O gate consolidado do HEAD atual está registrado na promoção para `main` do commit `e145257`.
