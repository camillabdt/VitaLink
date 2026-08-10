Registro de Riscos e Plano de Tratamento: Identidade e Autenticação (NIST CSF 2.0)
Este arquivo traduz as ameaças de identidade, autenticação e privilégios em riscos de negócio para o VitaLink, avaliando probabilidade e impacto (escala de 1 a 4), e definindo controles alinhados ao NIST Cybersecurity Framework 2.0.
1. Registro e Avaliação de Riscos
ID	Descrição do Risco	Ameaças / Abusos Base	Prob. (1-4)	Impacto (1-4)	Pontuação	Nível	Justificativas (Probabilidade e Impacto)
R01	Falso profissional obtém acesso indevido por meio de cadastro fraudulento.	T01, CA01	3	4	12	Crítico	Probabilidade: Sem validação automatizada de registro profissional (ex: CRM), a facilidade de criar contas falsas é alta (3).
Impacto: Quebra total de confiança. Pacientes expõem dados sensíveis a golpistas, gerando passivo legal (4).
R02	Conta de paciente é comprometida por roubo de credenciais/sessão.	T02, CA02	3	4	12	Crítico	Probabilidade: Ataques de phishing e vazamento de senhas são comuns. Sem MFA, o roubo de conta é muito provável (3).
Impacto: Acesso completo e irrestrito ao histórico médico do paciente e possibilidade de ações fraudulentas em seu nome (4).
R03	Usuário obtém privilégios superiores ou acessa dados de terceiros.	T03, CA01, CA02	2	4	8	Alto	Probabilidade: Exige conhecimento técnico para manipular requisições na API (IDOR/BOLA), diminuindo a facilidade de exploração em massa (2).
Impacto: Acesso cruzado a dados de múltiplos pacientes ou obtenção de funções administrativas compromete o sistema inteiro (4).
*(Cálculo da Pontuação: Probabilidade × Impacto. Escala de Níveis: 1–3 = Baixo	4–7 = Médio	8–11 = Alto	12–16 = Crítico)*				
2. Plano de Tratamento e Controles (NIST CSF 2.0)

| Risco | Estratégia | Controles Propostos | Função NIST CSF 2.0 | Responsável | Evidências de Implementação | Risco Residual (Estimativa) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| R01 | Mitigar | 1. Integração com API de conselhos de classe (ex: CFM) para verificação automática de registro profissional.<br>2. Validação de identidade (documento com foto / KYC) na integração da conta (Onboarding). | Proteger (PR)<br>Proteger (PR) | Equipe de Produto / Backend | Logs de consultas na API do conselho de classe; Status de conta "Verificada" exigido no banco de dados para liberar acessos médicos. | Médio (4)<br>(Prob. 1 × Imp. 4)* |
| R02 | Mitigar | 1. Implementar Autenticação Multifator (MFA) obrigatória.<br>2. Alertas de login por e-mail para novos dispositivos ou locais suspeitos.<br>3. Gestão segura de sessão (timeout de inatividade e revogação de tokens JWT). | Proteger (PR)<br>Detectar (DE)<br>Proteger (PR) | Equipe de Segurança / Backend | Configuração de MFA ativa nos perfis; E-mails automáticos disparados; Tokens de sessão expirando em tempo hábil (ex: 30 min). | Médio (4)<br>(Prob. 1 × Imp. 4)* |
| R03 | Mitigar | 1. Autorização rigorosa no backend baseada no token (RBAC/ABAC), não confiando em IDs enviados na URL pelo cliente.<br>2. Aplicação do Princípio do Menor Privilégio em todos os perfis. | Proteger (PR)<br>Proteger (PR) | Equipe de Backend / QA | Casos de teste automatizados falhando em tentativas de acesso cruzado (IDOR); Revisão de código exigindo validação de escopo em rotas sensíveis. | Médio (4)<br>(Prob. 1 × Imp. 4)* |
* Nota: Como se tratam de dados de saúde altamente sensíveis (PHI), o impacto em caso de falha sistêmica de identidade ou vazamento de dados sempre se mantém em 4. Os controles aplicados derrubam a probabilidade para 1, resultando no menor risco residual possível: 4, classificado como Médio pela escala oficial.
