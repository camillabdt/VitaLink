# Casos de Abuso — Bloco C (Disponibilidade e Sobrecarga)

---

### CA09 — Sobrecarga da API

| Atributo | Detalhamento |
| :--- | :--- |
| **Ameaças Relacionadas** | T13 (Sobrecarga de requisições na API) |
| **Categorias STRIDE** | Negação de Serviço (*Denial of Service - DoS*) |
| **Componentes Afetados** | A09 (API), A10 (Banco de dados), A11 (Servidor da aplicação) |
| **Usuários Afetados** | Pacientes e Profissionais de Saúde |
| **Ator** | Atacante externo, script automatizado ou *botnet*. |
| **Objetivo** | Causar a indisponibilidade do sistema, impedindo que médicos e pacientes acessem ou enviem dados. |
| **Condições Prévias** | A API do VitaLink está exposta na internet e não possui políticas adequadas de limitação de taxa (*rate limiting*) ou bloqueio de IPs suspeitos. |
| **Fluxo de Abuso** | **1.** O atacante mapeia os endpoints públicos da API do VitaLink.<br>**2.** Utilizando um script, o atacante dispara milhares de requisições por segundo direcionadas a esses endpoints.<br>**3.** O servidor da aplicação tenta processar todas as chamadas, esgotando suas threads e sobrecarregando as conexões com o banco de dados.<br>**4.** O sistema fica incapaz de responder a requisições legítimas, gerando erros de *timeout*. |
| **Impacto e Duração** | O sistema cai completamente. A indisponibilidade pode durar de minutos a várias horas, até que a equipe técnica identifique o padrão do ataque e implemente regras de bloqueio (WAF/firewall) para mitigar os acessos maliciosos. |

---

### CA10 — Esgotamento do armazenamento por envio massivo

| Atributo | Detalhamento |
| :--- | :--- |
| **Ameaças Relacionadas** | T14 (Esgotamento do armazenamento) e T15 (Corrupção ou exclusão de arquivos) |
| **Categorias STRIDE** | Negação de Serviço (*Denial of Service*) e Adulteração (*Tampering*) |
| **Componentes Afetados** | A12 (Armazenamento de documentos), A04 (Exames, laudos e imagens médicas) |
| **Usuários Afetados** | Pacientes e Profissionais de Saúde |
| **Ator** | Usuário mal-intencionado (com conta no sistema) ou atacante explorando uma brecha no fluxo de upload. |
| **Objetivo** | Consumir todo o espaço de disco do servidor, paralisando novos registros e corrompendo envios simultâneos. |
| **Condições Prévias** | O sistema permite upload de arquivos sem validação rigorosa de tamanho máximo por arquivo ou não define uma cota limite de armazenamento por usuário. |
| **Fluxo de Abuso** | **1.** O atacante se autentica no VitaLink com uma conta de paciente ou profissional.<br>**2.** Por meio de um script, o atacante inicia o envio de milhares de arquivos extremamente pesados.<br>**3.** O armazenamento do sistema atinge 100% de sua capacidade.<br>**4.** Processos de gravação legítimos que estavam ocorrendo ao mesmo tempo falham pela metade (corrompendo os arquivos - T15).<br>**5.** O sistema passa a recusar qualquer novo upload de usuários legítimos. |
| **Impacto e Duração** | Interrupção de funções vitais, impedindo que médicos anexem laudos pós-consulta. A indisponibilidade dura até que o alerta de disco cheio seja recebido, os arquivos de lixo sejam deletados e cotas sejam configuradas. |
