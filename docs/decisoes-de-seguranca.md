# Decisões de segurança propostas

## Status

Estas são decisões de projeto aprovadas para orientar os documentos do VitaLink. Elas são requisitos e controles **propostos**. Não constituem evidência de implementação.

| ID | Decisão |
| --- | --- |
| DS01 | O escopo atual tem apenas Paciente e Profissional de Saúde. Não haverá Administrador ou Suporte com acesso a dados médicos nesta entrega. |
| DS02 | O cadastro de profissional exige identificação e registro profissional informados; a conta só pode solicitar acesso após validação manual pela equipe responsável. O mecanismo de validação será definido na implementação. |
| DS03 | A autenticação usa uma conta individual. A recuperação de conta deve invalidar sessões anteriores; sessões não são autorização e expiram após 30 minutos de inatividade ou 8 horas de duração máxima. |
| DS04 | Cada autorização lista um paciente, um profissional, categorias de dado (`histórico`, `consultas`, `exames`, `laudos`, `receitas` e `imagens`) e operações (`consultar`, `anexar` ou `atualizar`). Exclusão não é concedida a profissionais. |
| DS05 | Uma autorização vale 30 dias por padrão. O paciente pode escolher prazo menor ou maior, limitado a 90 dias. Sem data de fim, a autorização é inválida. |
| DS06 | A API reavalia paciente, profissional, categoria, operação, estado e prazo no servidor a cada acesso. Revogação impede imediatamente novos acessos; a sessão pode continuar autenticada, mas não conserva autorização. |
| DS07 | O paciente pode anexar documentos e registrar dados próprios, mas não altera registros clínicos criados por profissional. O profissional só cria ou atualiza dados dentro da categoria e operação concedidas. |
| DS08 | Solicitação, concessão, recusa, revogação, expiração, consulta, criação, atualização e negação devem registrar ator, alvo, operação, resultado e horário. Senhas, tokens completos e conteúdo dos documentos não entram no log. |
| DS09 | A equipe define os papéis de Desenvolvimento, Infraestrutura e Segurança. Segurança recebe alertas; Desenvolvimento corrige controles; Infraestrutura trata disponibilidade e recuperação. |
| DS10 | D01 alerta após 5 negações de autorização para a mesma conta em 10 minutos. D02 alerta em qualquer acesso negado após revogação ou expiração. D03 alerta ao exceder 20 requisições por minuto ou arquivo de 20 MB. D04 alerta após 5 falhas de autenticação para a mesma conta em 10 minutos ou tentativa de reutilização de sessão invalidada após recuperação; os números devem ser reavaliados com métricas reais. |

As escolhas de tecnologia, responsáveis nominais, execução de validação manual, retenção de logs e métricas reais continuam dependentes da implementação e não são inferidas por este documento.
