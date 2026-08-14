# Etapa 6 — Monitoramento, detecção e resposta a incidentes

## Status

Este roteiro separa a telemetria já produzida pela aplicação das regras de detecção ainda propostas.

O backend persiste eventos de auditoria para autenticação, autorizações, documentos, dados clínicos, notificações e negações, além de emitir logs operacionais mínimos. O repositório ainda não possui coleta centralizada, correlação temporal, painel de monitoramento nem emissão de alertas D01–D08. Portanto, os eventos são implementados, mas a detecção ativa permanece pendente.

A Etapa 6 complementa os controles preventivos das etapas anteriores: impedir uma operação indevida e detectar que uma tentativa ocorreu são objetivos diferentes e complementares.

## Objetivos de monitoramento

O monitoramento proposto deve permitir:

1. identificar tentativas repetidas de acesso indevido;
2. detectar uso de autorização revogada ou expirada;
3. identificar sinais de comprometimento de conta ou sessão;
4. observar alterações ou exclusões indevidas de informação clínica;
5. detectar tentativas de acesso público ou sem autorização a documentos;
6. identificar padrões de extração anormal de dados;
7. observar sobrecarga da API e pressão sobre armazenamento;
8. preservar evidência suficiente para investigação e resposta;
9. detectar falhas no próprio mecanismo de auditoria.

## Eventos mínimos a registrar

Com base em DS08, os eventos de segurança devem registrar, quando aplicável:

- identificador do ator autenticado;
- tipo de perfil;
- recurso ou paciente afetado;
- operação solicitada;
- resultado da operação;
- data e horário;
- identificador de sessão sem registrar o token completo;
- origem técnica necessária à investigação, como IP, quando definida na implementação;
- motivo de uma negação de autorização;
- criação, concessão, recusa, revogação e expiração de autorização;
- consulta, criação e atualização de informação clínica;
- tentativa de exclusão quando a operação não for permitida;
- tentativa de acesso a documento sem sessão ou autorização vigente;
- volume de consultas à API;
- tamanho e resultado de operações de upload;
- falhas na geração, envio ou persistência dos próprios registros de auditoria.

Não devem ser registrados em logs:

- senhas;
- tokens completos;
- segredos de autenticação;
- conteúdo integral de documentos médicos;
- nome, e-mail, CPF, áudio ou texto clínico;
- informações clínicas além das estritamente necessárias à identificação do evento.

## Fontes de dados e cobertura

| Fonte                  | Eventos principais                                                           | Uso                                                           |
| ---------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Autenticação e sessão  | login, falha de login, recuperação de conta, criação e invalidação de sessão | Detectar possível comprometimento de conta                    |
| API                    | requisições, resposta, negação de autorização, volume e rota                 | Detectar abuso de acesso, enumeração e sobrecarga             |
| Autorização            | concessão, recusa, revogação e expiração                                     | Correlacionar acesso com consentimento                        |
| Dados clínicos         | criação, atualização e tentativa de exclusão                                 | Investigar alterações indevidas                               |
| Documentos             | visualização, download e negação de acesso                                   | Detectar rota pública, IDOR ou acesso sem autorização vigente |
| Upload e armazenamento | tamanho, tipo, resultado e uso de quota                                      | Detectar pressão de capacidade                                |
| Auditoria              | criação e persistência de eventos                                            | Detectar falha de rastreabilidade                             |

## Regras de detecção propostas

| ID  | Evento observado                                  | Condição de acionamento                                                                                                                           | Destino        | Ação inicial                                                                                              | Risco         |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------- | ------------- |
| D01 | Tentativa de consulta ou alteração de dado médico | Cinco negações de autorização para a mesma conta em 10 minutos                                                                                    | Segurança      | Registrar, investigar contexto e avaliar bloqueio temporário                                              | R04–R06       |
| D02 | Uso de sessão após alteração de autorização       | Qualquer acesso negado após revogação ou expiração para o mesmo paciente-profissional                                                             | Segurança      | Preservar evidência e investigar tentativa de reutilização da autorização                                 | R05           |
| D03 | Envio de documento ou volume de requisições à API | Mais de 20 requisições por minuto ou arquivo acima de 20 MB                                                                                       | Infraestrutura | Aplicar limitação correspondente, registrar e verificar disponibilidade/capacidade                        | R13–R14       |
| D04 | Autenticação ou recuperação de conta              | Cinco falhas de autenticação para a mesma conta em 10 minutos, ou tentativa de reutilização de sessão invalidada após recuperação da conta        | Segurança      | Proteger a conta, invalidar sessão quando aplicável e investigar possível comprometimento                 | R02           |
| D05 | Acesso indevido a documento                       | Qualquer tentativa de acessar documento sem sessão e autorização vigentes, inclusive por rota pública ou URL permanente introduzida por regressão | Segurança      | Negar acesso, registrar metadados mínimos e verificar repetição ou exposição                              | R10           |
| D06 | Consulta de dados médicos em volume anormal       | Uma conta consulta quantidade de pacientes ou documentos significativamente acima do padrão esperado para seu perfil                              | Segurança      | Restringir temporariamente a atividade quando necessário e investigar possível extração em massa          | R11           |
| D07 | Alteração ou exclusão de informação clínica       | Tentativa de operação sem permissão correspondente ou tentativa de exclusão de registro clínico por perfil não autorizado                         | Segurança      | Negar operação, preservar evento e verificar possível adulteração                                         | R07, R08, R15 |
| D08 | Falha de auditoria                                | Uma operação crítica esperada ocorre sem o respectivo evento de auditoria, ou o mecanismo de persistência de logs apresenta falha                 | Segurança      | Tratar como perda de rastreabilidade, preservar fontes alternativas e investigar o mecanismo de auditoria | R09, R12      |

Os limiares numéricos de D01, D02 e D03 seguem DS10. O limiar numérico de D04 utiliza a mesma janela inicial de observação de dez minutos e deverá ser calibrado com dados reais antes da implantação.

D06 depende de uma linha de base de uso ainda inexistente. Portanto, a expressão "significativamente acima do padrão esperado" representa um requisito de detecção comportamental cuja métrica deverá ser definida após a obtenção de dados operacionais reais.

## Severidade inicial dos alertas

| Regra | Severidade inicial | Justificativa                                                                |
| ----- | ------------------ | ---------------------------------------------------------------------------- |
| D01   | Alta               | Pode indicar tentativa sistemática de acesso fora do escopo                  |
| D02   | Alta               | Indica tentativa de reutilização após revogação ou expiração                 |
| D03   | Alta               | Pode afetar disponibilidade da API ou capacidade de armazenamento            |
| D04   | Alta               | Pode representar tentativa de comprometimento de conta                       |
| D05   | Alta               | Envolve tentativa de acesso a documento fora de sessão ou autorização válida |
| D06   | Alta               | Pode indicar extração em massa de dados médicos                              |
| D07   | Crítica            | Pode envolver alteração ou remoção indevida de informação clínica            |
| D08   | Alta               | A perda de rastreabilidade prejudica investigação e responsabilização        |

A severidade deverá ser reavaliada durante a triagem considerando contexto, impacto real, repetição e confirmação do evento.

## Roteiro de resposta a incidentes

### 1. Identificação e registro

Ao receber um alerta:

- registrar data, horário e regra acionada;
- preservar os identificadores técnicos disponíveis;
- identificar recursos, contas e pacientes potencialmente afetados;
- evitar acesso desnecessário a conteúdo médico durante a triagem.

### 2. Triagem

A equipe de Segurança deve determinar se o evento é:

- comportamento legítimo;
- falso positivo;
- evento suspeito ainda inconclusivo;
- incidente confirmado.

Mesmo um falso positivo deve ser registrado quando sua análise puder ajudar a ajustar uma regra de detecção.

### 3. Contenção

A contenção deve ser proporcional ao risco e pode incluir:

- bloquear temporariamente requisições;
- invalidar sessão;
- revogar autorização;
- suspender temporariamente operação de upload;
- restringir acesso a recurso específico;
- aplicar limitação de requisições;
- isolar componente afetado quando necessário.

A contenção não deve apagar ou alterar a evidência necessária à investigação.

### 4. Investigação

A investigação deve correlacionar:

- ator;
- sessão;
- paciente ou recurso;
- operação;
- resultado;
- horário;
- sequência de eventos;
- autorizações vigentes no momento;
- alterações ou acessos posteriores relacionados.

A análise deve respeitar minimização de dados: o conteúdo médico não deve ser acessado quando metadados e eventos forem suficientes.

### 5. Correção

Desenvolvimento deve corrigir controles de aplicação quando a causa estiver em autorização, validação, lógica de negócio ou outro comportamento do software.

Infraestrutura deve atuar em indisponibilidade, capacidade, rede, armazenamento e recuperação operacional.

Segurança coordena a análise, valida a contenção e acompanha as ações corretivas, conforme DS09.

### 6. Recuperação

Quando aplicável:

- restaurar serviço;
- recuperar versão anterior de informação;
- reativar operação somente após validação da correção;
- manter monitoramento reforçado durante o retorno à normalidade.

### 7. Comunicação

A necessidade, o conteúdo, o responsável e o canal de comunicação deverão ser definidos de acordo com a natureza e o impacto confirmado do incidente.

A existência de um alerta isolado não deve ser apresentada automaticamente como violação de dados.

### 8. Pós-incidente

Após o encerramento:

- registrar causa identificada;
- documentar impacto;
- registrar ações executadas;
- revisar regra de detecção;
- revisar limiares quando necessário;
- identificar controles preventivos que precisam ser alterados;
- registrar ações pendentes e responsáveis.

## Responsabilidades

| Papel           | Responsabilidade principal                                                          |
| --------------- | ----------------------------------------------------------------------------------- |
| Segurança       | Receber alertas, realizar triagem, coordenar investigação e acompanhar resposta     |
| Desenvolvimento | Corrigir controles, lógica de aplicação e mecanismos de segurança no software       |
| Infraestrutura  | Conter indisponibilidade, tratar capacidade, armazenamento e recuperação de serviço |

Os responsáveis nominais ainda dependem da organização da equipe na implantação. Os papéis acima correspondem à divisão funcional estabelecida em DS09.

## Validação das regras

A aplicação já permite gerar parte dos eventos de entrada. Cada regra ainda precisa de um teste controlado que comprove correlação e alerta, não apenas a negação preventiva da operação.

| Regra | Teste planejado                                                                         | Evidência esperada                        |
| ----- | --------------------------------------------------------------------------------------- | ----------------------------------------- |
| D01   | Produzir cinco negações autorizacionais em 10 minutos                                   | Alerta D01 com conta e janela temporal    |
| D02   | Revogar autorização e tentar reutilizá-la                                               | Negação registrada e alerta D02           |
| D03   | Exceder limite de requisição ou upload configurado em ambiente de teste                 | Restrição da operação e alerta D03        |
| D04   | Realizar sequência controlada de falhas de autenticação                                 | Alerta D04 sem exposição de senha         |
| D05   | Tentar acessar documento sem sessão ou autorização, inclusive por possível rota pública | Negação e alerta D05                      |
| D06   | Simular padrão de leitura acima da linha de base definida                               | Alerta D06 e registro do volume observado |
| D07   | Tentar alteração ou exclusão sem operação autorizada                                    | Negação e alerta D07                      |
| D08   | Simular indisponibilidade controlada do mecanismo de auditoria                          | Alerta D08 por falha de rastreabilidade   |

Os testes atuais exercitam negações de autorização, revogação, limites, documentos e auditoria, mas não demonstram que um alerta D01–D08 foi produzido. A tabela define os critérios restantes de validação da camada de detecção.

## Relação com o NIST CSF 2.0

Esta etapa se relaciona principalmente às funções:

- **Detect:** observação, correlação e identificação de eventos suspeitos;
- **Respond:** triagem, contenção, investigação, comunicação e correção;
- **Recover:** restauração de serviço ou informação e retorno controlado à operação.

As funções estão representadas como planejamento de segurança. A documentação não implica que uma capacidade operacional de SOC, SIEM, IDS ou resposta automatizada já exista.

## Limitações

- a aplicação gera eventos de auditoria, mas não há pipeline centralizado para consumi-los e correlacioná-los;
- não existe SIEM, IDS ou mecanismo centralizado de alertas versionado;
- os limiares iniciais não foram calibrados com tráfego real;
- a retenção dos logs ainda deve ser definida antes da implantação;
- fontes técnicas como IP, dispositivo e localização dependem das decisões de implementação e de requisitos de privacidade;
- as regras deverão ser revisadas após testes e obtenção de dados operacionais.
