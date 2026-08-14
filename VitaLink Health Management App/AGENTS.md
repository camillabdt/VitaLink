# VitaLink Web

Frontend React, TypeScript, Vite e Tailwind CSS do VitaLink.

## Estrutura

- `src/main.tsx`: ponto de entrada React.
- `src/App.tsx`: composição principal e roteamento interno.
- `src/index.css`: estilos globais e tokens do Tailwind CSS v4.
- `src/components/`: telas e componentes por perfil e domínio.
- `src/services/`: acesso à API.
- `src/data/mockData.ts`: dados estáticos ainda usados por partes do painel do paciente; não os trate como dados persistidos.
- `vite.config.ts`: React, Tailwind CSS, alias `@`, proxy da API e Vitest.

## Comandos

- `pnpm dev`: servidor local na porta definida por `PORT` ou `8443`.
- `pnpm test`: testes do frontend.
- `pnpm build`: build de produção.
- `pnpm format:check`: verificação de formatação.

Preserve acessibilidade, responsividade e os controles de segurança documentados no repositório. Não apresente dados estáticos como evidência de integração com a API.
