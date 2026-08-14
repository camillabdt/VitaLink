# Implementação da issue #51 — recuperação de conta e gestão de sessões

## Estado e limite da entrega

Esta fatia vertical conecta a recuperação de senha, a recuperação reforçada do segundo fator, a troca autenticada de senha, a listagem e o encerramento de sessões ao frontend exportado do Figma Make, à API e ao PostgreSQL.

A entrega usa somente dados sintéticos. A recuperação automática reforçada é exclusiva do paciente. Para o profissional, a solicitação pública permanece genérica e a auditoria registra a necessidade de retorno à validação manual definida em DS12.

## Baseline de interface reutilizada

| Componente                               | Comportamento conectado                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `components/auth/ForgotPasswordPage.tsx` | Solicitação genérica, redefinição por link e recuperação reforçada com chave offline e novo TOTP. |
| `components/patient/PatientProfile.tsx`  | Troca de senha com step-up TOTP, carregamento e encerramento de sessões próprias.                 |
| `components/shared/Sidebar.tsx`          | Logout no servidor já entregue na #50 e Configurações direcionada ao perfil existente.            |
| `App.tsx`                                | Entrada direta e recarregável pelos caminhos `/reset-password` e `/recover-totp`.                 |

Foram preservados cards, cores, tipografia, espaçamento e formulários da baseline. O e-mail deixou de ser repetido no estado de confirmação para reduzir exposição em tela compartilhada. O prazo visual foi corrigido de 30 para 15 minutos para coincidir com a API. O botão simulado de ativação TOTP foi removido do perfil, pois contas autenticadas já possuem TOTP ativo.

## Comportamentos executáveis

### Recuperação de senha

1. `POST /api/v1/password-recovery-requests` responde genericamente para conta existente ou inexistente.
2. Conta ativa recebe no Mailpit um token opaco de uso único e validade de 15 minutos; somente o HMAC é persistido.
3. `POST /api/v1/password-resets` aplica a política de senha, consome o token e revoga todas as sessões.
4. O TOTP e os códigos de recuperação existentes são preservados.

### Recuperação reforçada do segundo fator

1. `POST /api/v1/totp-recovery-requests` mantém resposta genérica e envia link apenas para paciente ativo.
2. `POST /api/v1/totp-recoveries` exige o token do e-mail confirmado e a chave offline independente.
3. A conclusão invalida todas as sessões, códigos, chave offline e segredo TOTP anteriores na mesma transação.
4. A API emite somente uma sessão restrita de 15 minutos para cadastrar e confirmar um novo TOTP.
5. Novos códigos e nova chave offline são exibidos uma única vez.
6. Para profissional, nenhum link é enviado e o evento registra `manual_validation_required` sem revelar essa decisão na resposta pública.

### Troca de senha e sessões

- a troca exige senha atual e confirmação TOTP vinculada à ação `password_change`, à sessão e ao prazo máximo de cinco minutos;
- a confirmação de step-up é de uso único;
- a troca preserva a sessão corrente e revoga as demais;
- `GET /api/v1/sessions` retorna somente sessões válidas da conta autenticada;
- `DELETE /api/v1/sessions/{id}` exige `Origin`, CSRF e propriedade do recurso;
- tentativa de encerrar sessão de outra conta retorna 404 e não afeta a vítima;
- inatividade superior a 30 minutos ou duração absoluta de oito horas revoga a sessão, nega o cookie e registra o motivo na auditoria;
- logout continua revogando a sessão atual no servidor e removendo o cookie.

## Controles de segurança verificáveis

- tokens, códigos e chave offline persistidos somente como HMAC;
- segredo TOTP cifrado em repouso e substituído na recuperação reforçada;
- senhas armazenadas com Argon2id, mínimo de 12, máximo de 128 e lista local de senhas comuns;
- limitação progressiva por alvo pseudônimo e origem em solicitações, tokens de redefinição, recuperação reforçada e step-up TOTP;
- bloqueio transacional para consumo único de tokens, chave offline e confirmações;
- cookie opaco `__Host-`, `Secure`, `HttpOnly`, `SameSite=Strict` e sem `Domain`;
- escritas autenticadas protegidas por CSRF vinculado à sessão e validação de `Origin`;
- relógio do servidor substituível em teste para verificar inatividade, duração absoluta e step-up sem espera real;
- sucesso e negação auditados com correlação e identificadores pseudônimos, sem e-mail, senha, TOTP, chave ou token;
- eventos de auditoria protegidos pelo trigger append-only entregue na #50;
- logs HTTP continuam registrando todas as requisições sem corpo ou parâmetros.

## TDD e evidências

Cada comportamento foi iniciado por um teste da interface pública em RED. Os motivos observados incluíram 404/405 para rotas ausentes, resposta 200 após o relógio avançar além do limite, ausência de chamada à API nos componentes simulados, rótulos não associados e botões inertes. A implementação mínima foi adicionada após cada RED e a suíte afetada voltou a GREEN antes do ciclo seguinte.

Os testes backend usam PostgreSQL e Mailpit reais. Dublê foi usado apenas para o relógio, fronteira explicitamente permitida por `docs/etapa5-verificacao-de-seguranca.md`. Os testes de componentes substituem somente a fronteira HTTP pública.

| Suíte | Cobertura desta issue                                                                                                       |
| ----- | --------------------------------------------------------------------------------------------------------------------------- |
| TS01  | recuperação simples e reforçada, step-up TOTP, troca de senha, profissional em validação manual e limites progressivos.     |
| TS02  | sessões próprias, IDOR negado, CSRF, `Origin`, invalidação, logout, inatividade e duração absoluta.                         |
| TS06  | sucesso, negação, expiração, correlação, pseudonimização, ausência de segredos e auditoria append-only acumulada.           |
| TS08  | rotas públicas, carregamento, vazio, sucesso, erro, sessão expirada, rótulos acessíveis, controles reais e baseline visual. |

Os comandos e resultados finais desta fatia devem ser consultados no histórico do CI associado ao commit de integração. Localmente, a validação obrigatória executa `uv run pytest`, `ruff format --check`, `ruff check`, `pip-audit`, `pnpm format:check`, `pnpm audit`, `pnpm test` e `pnpm build`.
