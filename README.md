<div align="center">

<img src="imagens/medico-prontuario.gif" width="420"/>

# 💙 VitaLink

### Prontuário Digital Compartilhado

Sistema seguro para armazenamento, gerenciamento e compartilhamento de exames, consultas e documentos médicos.

![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-00b894?style=for-the-badge)
![Disciplina](https://img.shields.io/badge/Disciplina-Engenharia%20de%20Software%20Seguro-0984e3?style=for-the-badge)
![GitHub](https://img.shields.io/badge/GitHub-Projeto%20Acadêmico-2d3436?style=for-the-badge)

---

*"Sua saúde. Seus dados. Seu controle."*

</div>

---

# 📖 Sobre o Projeto

O **VitaLink** é uma proposta de sistema para gerenciamento seguro de informações médicas.

O objetivo é permitir que pacientes mantenham um histórico digital de sua saúde, reunindo exames, consultas, receitas, laudos e imagens médicas em um único ambiente.

Os profissionais de saúde poderão registrar atendimentos, anexar documentos e consultar informações dos pacientes **somente mediante autorização**.

Este projeto está sendo desenvolvido na disciplina de **Engenharia de Software Seguro**, com foco na análise de ameaças, casos de abuso e requisitos de segurança antes da implementação.

---

# 🎯 Objetivos

- Centralizar informações médicas
- Facilitar o compartilhamento entre paciente e profissional
- Garantir privacidade dos dados
- Proteger informações sensíveis
- Aplicar princípios de Engenharia de Software Seguro
- Realizar Modelagem de Ameaças utilizando STRIDE

---

# 👥 Perfis de Usuário

## 🧑 Paciente

O paciente poderá:

- Criar conta
- Fazer login
- Editar perfil
- Anexar exames
- Anexar receitas
- Anexar laudos
- Anexar imagens médicas
- Registrar consultas
- Visualizar histórico médico
- Compartilhar informações
- Revogar acesso de profissionais
- Consultar histórico de acessos

---

## 👨‍⚕️ Profissional de Saúde

O profissional poderá:

- Criar conta profissional
- Fazer login
- Solicitar acesso ao paciente
- Registrar consultas
- Adicionar exames
- Adicionar laudos
- Adicionar receitas
- Consultar pacientes autorizados
- Atualizar informações médicas

---

# 🔐 Principais Recursos Protegidos

- 👤 Dados pessoais
- 📄 Exames
- 🩺 Consultas
- 💊 Receitas
- 🖼️ Imagens médicas
- 📑 Laudos
- 🔑 Senhas
- 🔐 Tokens
- 🗄 Banco de Dados
- 🌐 API
- ☁️ Servidor
- 📜 Logs do sistema

---

# 🏗 Arquitetura Simplificada

```mermaid
flowchart LR

Paciente --> VitaLink

Profissional --> VitaLink

VitaLink --> API

API --> Banco[(Banco de Dados)]

Banco --> API

API --> VitaLink

VitaLink --> Paciente

VitaLink --> Profissional
```

---

# 🔄 Fluxo do Sistema

```text
Paciente
    │
    │ Faz upload de exames
    │
    ▼
VitaLink
    │
    ├── Armazena documentos
    ├── Gerencia permissões
    ├── Registra acessos
    │
    ▼
Profissional autorizado
```

---

# 🛡 Modelagem de Ameaças (STRIDE)

| Categoria | Exemplo |
|------------|---------|
| 🕵️ Spoofing | Falso médico acessa o sistema |
| ✏️ Tampering | Alteração de exames |
| 🚫 Repudiation | Usuário nega ter alterado um prontuário |
| 🔓 Information Disclosure | Vazamento de exames |
| ⚠️ Denial of Service | Sistema indisponível |
| 👑 Elevation of Privilege | Paciente obtém privilégios administrativos |

---

# 🚨 Casos de Abuso

- Cadastro de falso profissional
- Roubo da conta do paciente
- Acesso sem autorização
- Alteração de exames
- Exclusão de laudos
- Compartilhamento indevido
- Ataque ao banco de dados
- Ataque de negação de serviço
- Vazamento de informações médicas
- Uso de permissões expiradas

---

# 📂 Organização do Projeto

```text
vitalink-prontuario-seguro
│
├── README.md
│
├── docs/
│      modelagem-de-ameacas.md
│
├── diagramas/
│      contexto.drawio
│      contexto.png
│      fluxo.drawio
│      fluxo.png
│
└── imagens/
       medico-prontuario.gif
       logo.png
```

---

# 👩‍💻 Integrantes

| Integrante | Responsabilidade |
|------------|-----------------|
| Integrante 1 | Organização do projeto e revisão |
| Integrante 2 | Usuários, ativos e arquitetura |
| Integrante 3 | STRIDE (Spoofing, Tampering e Repudiation) |
| Integrante 4 | STRIDE (Information Disclosure, DoS e Elevation of Privilege) |
| Integrante 5 | Casos de abuso e considerações finais |

---

# 📋 Tecnologias

- Markdown
- GitHub
- Mermaid
- Draw.io

---

# 📚 Disciplina

**Engenharia de Software Seguro**

Trabalho de Modelagem de Ameaças utilizando STRIDE e Casos de Abuso.

---

# ❤️ Nossa missão

Desenvolver um sistema que coloque o paciente no controle dos seus próprios dados de saúde, garantindo **privacidade**, **segurança** e **compartilhamento consciente** das informações médicas.

---

<div align="center">

## 💙 VitaLink

### Sua saúde. Seus dados. Seu controle.

<img src="imagens/logo.png" width="140"/>

</div>
