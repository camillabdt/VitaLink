<div align="center">

<img src="imagens/logo.png" alt="Logo do VitaLink" width="620">

![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-00b894?style=for-the-badge)
![Disciplina](https://img.shields.io/badge/Disciplina-Engenharia%20de%20Software%20Seguro-0984e3?style=for-the-badge)
![GitHub](https://img.shields.io/badge/GitHub-Projeto%20Acadêmico-2d3436?style=for-the-badge)

_Sua saúde. Seus dados. Seu controle._

</div>

---

# 📖 Sobre o projeto

O **VitaLink** é uma proposta de sistema para gerenciamento seguro de informações médicas.

O objetivo é permitir que pacientes mantenham um histórico digital de sua saúde, reunindo exames, consultas, receitas, laudos e imagens médicas em um único ambiente.

Os profissionais de saúde poderão registrar atendimentos, anexar documentos e consultar informações dos pacientes **somente mediante autorização**.

O projeto é desenvolvido na disciplina de **Engenharia de Software Seguro**, com foco na proteção de dados médicos e no controle consciente de seu compartilhamento.

## 🛠️ Ambiente de desenvolvimento

Instale o [uv](https://docs.astral.sh/uv/getting-started/installation/) e prepare o ambiente local:

```bash
uv sync
```

Execute comandos dentro do ambiente com `uv run`, por exemplo:

```bash
uv run python --version
```

---

# 🎯 Objetivos

- Centralizar informações médicas.
- Facilitar o compartilhamento entre paciente e profissional.
- Garantir a privacidade dos dados.
- Proteger informações sensíveis.
- Aplicar princípios de Engenharia de Software Seguro.
- Realizar Modelagem de Ameaças utilizando STRIDE.

---

# 👥 Perfis de usuário

## 🧑 Paciente

O paciente poderá:

- Criar conta.
- Fazer login.
- Editar perfil.
- Anexar exames.
- Anexar receitas.
- Anexar laudos.
- Anexar imagens médicas.
- Registrar consultas.
- Visualizar o histórico médico.
- Compartilhar informações.
- Revogar o acesso de profissionais.
- Consultar o histórico de acessos.

## 👨‍⚕️ Profissional de Saúde

O profissional poderá:

- Criar conta profissional.
- Fazer login.
- Solicitar acesso ao paciente.
- Registrar consultas.
- Adicionar exames.
- Adicionar laudos.
- Adicionar receitas.
- Consultar pacientes autorizados.
- Atualizar informações médicas.

---

# 🔐 Principais recursos protegidos

| Categoria              | Recursos                                                 |
| ---------------------- | -------------------------------------------------------- |
| 👤 Dados pessoais      | Informações cadastrais de pacientes e profissionais      |
| 🩺 Informações médicas | Histórico, consultas, exames, receitas, laudos e imagens |
| 🔑 Controle de acesso  | Credenciais, tokens, permissões e autorizações           |
| 🗄️ Infraestrutura      | Banco de dados, API e servidor                           |
| 📜 Rastreabilidade     | Registros de auditoria e histórico de acessos            |

---

# 🔄 Fluxo geral do sistema

```text
Paciente
    │
    │ Mantém dados e autorizações
    ▼
VitaLink
    ├── Armazena informações médicas
    ├── Gerencia permissões
    └── Registra acessos
    │
    ▼
Profissional autorizado
```

---

# 🛡️ Documentação de segurança

Este painel reúne os documentos que detalham os ativos, perfis, permissões, ameaças, casos de abuso e critérios de risco do VitaLink.

| Área           | Documento                               | Referência                                                     |
| -------------- | --------------------------------------- | -------------------------------------------------------------- |
| Ativos         | Inventário de ativos                    | [Acessar documento](docs/inventario-de-ativos.md)              |
| Classificação  | Classificação CIA dos ativos            | [Acessar documento](docs/classificacao-cia-dos-ativos.md)      |
| Riscos         | Critérios de avaliação e risco residual | [Acessar documento](docs/etapa2-criterios-e-risco-residual.md) |
| Acesso         | Usuários, perfis e permissões           | [PR #27](https://github.com/camillabdt/VitaLink/pull/27)       |
| Acesso         | Fluxo de autorização e revogação        | [PR #28](https://github.com/camillabdt/VitaLink/pull/28)       |
| Ameaças        | Identidade, autenticação e privilégios  | [PR #30](https://github.com/camillabdt/VitaLink/pull/30)       |
| Ameaças        | Consentimento e acesso indevido         | [PR #29](https://github.com/camillabdt/VitaLink/pull/29)       |
| Casos de abuso | Catálogo central de casos de abuso      | [Acessar documento](docs/casos-de-abuso.md)                    |

Os documentos usam identificadores estáveis, como `T01` para ameaças, `CA01` para casos de abuso e `R01` para riscos, preservando a rastreabilidade entre os artefatos de segurança.

---

# 👩‍💻 Integrantes

- Amanda Dias
- Camilla Borchhardt
- Milena Castro
- Rafela Nunes
- Tauani Sauceda

---

# 📚 Disciplina

**Engenharia de Software Seguro**

---

# ❤️ Nossa missão

Desenvolver um sistema que coloque o paciente no controle dos próprios dados de saúde, garantindo **privacidade**, **segurança** e **compartilhamento consciente** das informações médicas.

---

<div align="center">

## 💙 VitaLink

### Sua saúde. Seus dados. Seu controle.

</div>
