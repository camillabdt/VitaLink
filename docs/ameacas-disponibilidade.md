# Modelagem de Ameaças — Disponibilidade e adulteração

Análise de ameaças focada nos impactos de indisponibilidade, sobrecarga e perda de dados no ambiente do **VitaLink**.

O [índice da Etapa 1](etapa1-modelagem-de-ameacas.md) mantém a rastreabilidade com os casos de abuso. A avaliação, priorização e tratamento proposto de T13, T14 e T15 estão em [Etapa 2](etapa2-riscos-e-tratamento.md), respectivamente como R13, R14 e R15. Não há controle implementado comprovado neste documento.

---

### T13 — Sobrecarga de requisições na API

- **Categoria STRIDE:** Negação de Serviço (_Denial of Service - DoS_)
- **Ativos Afetados:** A09 (API), A11 (Servidor da aplicação), A10 (Banco de dados)
- **Descrição da Ameaça:** Um atacante ou um surto imprevisível de acessos simultâneos dispara uma quantidade massiva de requisições HTTP para os endpoints da API (como rotas de login, consulta de histórico ou upload). O excesso de requisições esgota as threads de processamento da aplicação e as conexões do banco de dados, tornando a API responsiva com atrasos graves ou completamente fora do ar.
- **Impacto no Contexto de Saúde:**
  - **Profissionais de Saúde:** Ficam impossibilitados de consultar o histórico do paciente, exames anteriores e alergias durante um atendimento ou urgência médica. A indisponibilidade do sistema força o adiamento do atendimento ou obriga o médico a tomar decisões sem validar informações clínicas cruciais.
  - **Pacientes:** Impossibilitados de acessar receitas médicas digitais na farmácia para compra de medicamentos contínuos ou de apresentar seus exames em uma consulta presencial agendada.

---

### T14 — Esgotamento do armazenamento por envio massivo de arquivos

- **Categoria STRIDE:** Negação de Serviço (_Denial of Service - DoS_)
- **Ativos Afetados:** A12 (Armazenamento de documentos), A04 (Exames, laudos e imagens médicas), A11 (Servidor da aplicação)
- **Descrição da Ameaça:** Envio automatizado ou malicioso de um grande volume de arquivos pesados (ex.: imagens radiológicas/DICOM de altíssima resolução) ou sem limitação de quota/tamanho por requisição. Isso preenche rapidamente a capacidade total do disco no serviço de armazenamento do VitaLink, travando a gravação de novos dados no sistema.
- **Impacto no Contexto de Saúde:**
  - **Profissionais de Saúde:** Não conseguem anexar novos laudos, exames ou receitas ao final da consulta, correndo o risco de perda do registro do atendimento realizado no dia.
  - **Pacientes:** Impedidos de fazer o envio prévio de exames solicitados antes de uma consulta, prejudicando o acompanhamento clínico e a continuidade do tratamento.

---

### T15 — Corrupção ou exclusão indevida de arquivos e registros

- **Categoria STRIDE:** Adulteração (_Tampering_) e Negação de Serviço (_Denial of Service - DoS_)
- **Ativos Afetados:** A04 (Exames, laudos e imagens médicas), A05 (Receitas e prescrições médicas), A10 (Banco de dados), A12 (Armazenamento de documentos)
- **Descrição da Ameaça:** Adulteração maliciosa, falhas na persistência durante falha de energia/rede, ou execução de scripts sem validação de permissão que corrompem os cabeçalhos de arquivos armazenados ou excluem as referências de ponteiros no banco de dados.
- **Impacto no Contexto de Saúde:**
  - **Profissionais de Saúde:** Deparam-se com exames ou laudos corrompidos que não abrem, impedindo a interpretação correta de diagnósticos passados e podendo induzir a um diagnóstico equivocado caso informações estejam parcialmente corrompidas.
  - **Pacientes:** Perda definitiva e irrecuperável de documentos históricos (laudos, receitas e exames antigos), comprometendo todo o histórico médico acumulado no VitaLink e exigindo que o paciente refaça exames invasivos ou dispendiosos.

## Rastreabilidade

| Ameaça | Caso de abuso                                                                                                                                                                                       | Risco                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| T13    | [CA09 — Sobrecarga da API](etapa1-modelagem-de-ameacas.md#ca09--sobrecarga-da-api)                                                                                                                  | [R13](etapa2-riscos-e-tratamento.md#registro-consolidado) |
| T14    | [CA10 — Esgotamento do armazenamento](etapa1-modelagem-de-ameacas.md#ca10--esgotamento-do-armazenamento)                                                                                            | [R14](etapa2-riscos-e-tratamento.md#registro-consolidado) |
| T15    | [CA05 — Alteração maliciosa de exame](etapa1-modelagem-de-ameacas.md#ca05--alteração-maliciosa-de-exame) e [CA06 — Exclusão de registro](etapa1-modelagem-de-ameacas.md#ca06--exclusão-de-registro) | [R15](etapa2-riscos-e-tratamento.md#registro-consolidado) |
