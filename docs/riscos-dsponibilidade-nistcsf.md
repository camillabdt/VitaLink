# Registro de Riscos e Plano de Tratamento (NIST CSF 2.0)

Este arquivo traduz as ameaças de disponibilidade e integridade em riscos de negócio para o **VitaLink**, avaliando probabilidade e impacto (escala de 1 a 4), e definindo controles alinhados ao *NIST Cybersecurity Framework 2.0*.

---

## 1. Registro e Avaliação de Riscos

| ID | Descrição do Risco | Ameaças / Abusos Base | Prob. (1-4) | Impacto (1-4) | Pontuação | Nível | Justificativas (Probabilidade e Impacto) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R13** | **API fica indisponível** devido a sobrecarga de requisições. | T13, CA09 | 3 | 4 | 12 | **Alto** | **Probabilidade:** Sem *rate limiting*, APIs públicas são alvos frequentes de bots (3).<br>**Impacto:** A paralisação da API impede consultas e registros médicos durante atendimentos (4). |
| **R14** | **Armazenamento é esgotado** por envio massivo de arquivos. | T14, CA10 | 2 | 3 | 6 | **Médio** | **Probabilidade:** Exige ação intencional ou erro sistêmico, mas falta limite de cotas (2).<br>**Impacto:** Impede novos uploads de laudos, mas o histórico antigo pode continuar acessível via banco de dados (3). |
| **R15** | **Arquivos são perdidos ou corrompidos** indevidamente. | T15, CA10 | 2 | 4 | 8 | **Alto** | **Probabilidade:** Falhas no disco ou falhas lógicas durante uploads simultâneos (2).<br>**Impacto:** A perda irrecuperável do histórico médico afeta diretamente diagnósticos futuros e quebra a confiança no sistema (4). |

*(Cálculo da Pontuação: Probabilidade × Impacto. Escala de Níveis: 1 a 4 = Baixo | 6 a 8 = Médio | 9 a 12 = Alto | 16 = Crítico)*
