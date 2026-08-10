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
