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

---

## 2. Plano de Tratamento e Controles (NIST CSF 2.0)

| Risco | Estratégia | Controles Propostos | Função NIST CSF 2.0 | Responsável | Evidências de Implementação | Risco Residual (Estimativa) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R13** | Mitigar | 1. Implementar *Rate Limiting* por IP e token.<br>2. Configurar WAF para bloquear tráfego anômalo.<br>3. Monitoramento de uptime e latência da API. | **Proteger (PR)**<br>**Proteger (PR)**<br>**Detectar (DE)** | Equipe de Infraestrutura | Logs do WAF bloqueando bots; Painel de monitoramento (Grafana) ativo; Teste de carga com limite de requisições. | **Baixo (3)**<br>(Prob. 1 × Imp. 3) |
| **R14** | Mitigar | 1. Definir limite rigoroso de tamanho e tipo de arquivo por upload.<br>2. Aplicar cotas de armazenamento por usuário.<br>3. Alertas automatizados ao atingir 80% do disco. | **Proteger (PR)**<br>**Proteger (PR)**<br>**Detectar (DE)** | Equipe de Backend | Regras no código rejeitando arquivos > 10MB; Alertas configurados no serviço de nuvem (AWS/Azure). | **Baixo (2)**<br>(Prob. 1 × Imp. 2) |
| **R15** | Mitigar e Transferir | 1. Implementar rotina de Backup diário e imutável.<br>2. Plano de Recuperação de Desastres (DRP) testado.<br>3. Uso de *storage* em nuvem com replicação e alta durabilidade (transferência de risco físico). | **Recuperar (RC)**<br>**Recuperar (RC)**<br>**Proteger (PR)** | Equipe de Infra / DevOps | Relatórios de sucesso de backups; Ata de teste de restauração de ambiente; Contrato do provedor de nuvem (SLA). | **Médio (4)**<br>(Prob. 1 × Imp. 4)* |

*\* Nota R15: Mesmo diminuindo a probabilidade de ocorrência para 1, o impacto de uma perda de dados médicos sempre será 4. Logo, o risco residual mínimo aceitável é 4.*
