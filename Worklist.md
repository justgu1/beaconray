# 📝 WorkList — Detalhamento Técnico de Atividades

Este documento gerencia as tarefas técnicas de baixo nível necessárias para a execução do ecossistema Beaconray.

| ID | Módulo | Descrição Detalhada da Tarefa | Dependências | Complexidade | Status |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **HN-001** | Harness | Instalar o harness spec-driven do projeto: `AGENTS.md` (YAML enxuto), `.specs/SPECS.md`, `.specs/SKILLS.md`, `.specs/skills/`, `.specs/ADRS.md`, `CHANGELOG.md`. Regras always-on de caveman mode em `.cursor/`, `.windsurf/`, `.clinerules/`, `.github/copilot-instructions.md`. | Nenhuma | Baixa | ✅ Concluído |
| **QG-001** | Qualidade | Escrever `.specs/component-quality-spec.md`: gate obrigatório de HTML5 semântico, WCAG 2.1 AA, acesso multi-modal (teclado/voz/leitor de tela), orçamento de performance (ultra leve) e disciplina de tokens de animação. | HN-001 | Média | ✅ Concluído (spec escrita; aplicação prática em componente real ainda pendente) |
| **QG-002** | Qualidade | Escrever `.specs/component-qa-strategy-spec.md`: estratégia de QA em 3 camadas (Playwright+axe-core, Storybook, Cypress) documentada — implementação entra conforme QA-001/QA-002/QA-003 abaixo. | QG-001 | Baixa | ✅ Concluído (documentado; nenhuma camada implementada ainda) |
| **CP-001** | Compiler| Script Node.js isolado (Parser Engine) que consome AST de componente (`.specs/ast-component-spec.md`) e reconstrói o arquivo bruto no formato Mitosis `.lite.tsx`. Hoje consome AST escrito à mão (Studio ainda não existe); consumirá o mesmo formato vindo do Postgres/Studio depois. | Nenhuma (AST hand-authored) | Crítica | 🔄 Em andamento (v0: props→atributos/texto, validado ponta a ponta com fixture `Button`; v1 — state/eventos/condicional/loop — pendente) |
| **CP-002** | Compiler| Pipeline de compilação programática do Mitosis via API do Node.js, geradores de código pra `/react` (Functional Components), `/vue` (Composition API) e `/astro`. | CP-001 | Alta | 🔄 Em andamento (react/vue via geradores nativos; astro sem gerador nativo na versão pinada 0.14.0 — workaround via `componentToHtml` documentado em `.specs/mitosis-compiler-spec.md`) |
| **BK-001** | Backend | Modelar banco de dados Postgres: Criar migrations de tabelas `users`, `components`, `versions` e `audit_logs` utilizando colunas `jsonb` para a AST e criando índices GIN nas colunas de metadados para busca ultra-rápida. | Nenhuma | Média | ⏳ Pendente |
| **BK-002** | Backend | Escrever o Middleware de Validação de JSON Schema no Symfony para interceptar os payloads recebidos do Studio, garantindo que nenhuma AST inválida ou maliciosa corrompa a base de dados. | BK-001 | Alta | ⏳ Pendente |
| **BK-003** | Backend | Configurar o Provider do MinIO no Symfony utilizando o AWS SDK do PHP. Implementar classe de serviço `ArtifactStorageService` que lide exclusivamente com a geração de URLs pré-assinadas com criptografia HMAC-SHA256. | Nenhuma | Média | ⏳ Pendente |
| **BK-004** | Backend | Implementar arquitetura de filas assíncronas no Symfony (Messenger + transporte Redis). Criar o handler assíncrono `CompileComponentJob` com controle de tentativas (*retries*), tratamento de falhas e despacho de Webhooks de status para a UI do Studio. | BK-003 | Alta | ⏳ Pendente |
| **BK-005** | Backend | Desenvolver os endpoints REST da API `/v1/cli/handshake` e `/v1/cli/components/*` protegidos com controle de acesso baseado em escopos no Symfony Security (bundle específico de auth ainda não decidido — ver ADR-003). | BK-001 | Média | ⏳ Pendente |
| **CLI-001**| CLI | Criar arquitetura do binário Node.js com TypeScript usando `commander` e `inquirer`. Adicionar lógica de verificação de permissão do sistema operacional e escrita de sessão segura usando armazenamento nativo protegido. | Nenhuma | Média | ⏳ Pendente |
| **CLI-002**| CLI | Desenvolver o comando `npx beaconray add <slug>`. A tarefa exige fazer o download do stream de bytes via Axios da URL assinada do MinIO, verificar a integridade do arquivo via hash SHA256 e descompactar o tarball gravando os arquivos em disco de acordo com o arquivo de configuração do projeto. | BK-005, CLI-001| Alta | ⏳ Pendente |
| **ST-001** | Studio | Desenvolver o wrapper do Canvas interativo utilizando React Context API e `@dnd-kit/core`. Implementar interceptadores de evento de teclado para garantir movimentação de nós por meio das setas direcionais e tecla Enter (Foco de Acessibilidade). | Nenhuma | Alta | ⏳ Pendente |
| **ST-002** | Studio | Criar a interface de parametrização atômica baseada no Figma. Mapear inputs visuais para propriedades HTML, forçando validações onde tipos como `button` exijam obrigatoriamente a propriedade `aria-label` ou `aria-labelledby`. Precisa produzir o mesmo formato de `.specs/ast-component-spec.md` que o compiler (CP-001) já consome. | ST-001 | Média | ⏳ Pendente |
| **QA-001** | Testes | Playwright + `@axe-core/playwright` (camada 1 da estratégia de QA, `.specs/component-qa-strategy-spec.md`): roda em background pós-build, renderiza o componente gerado headless, executa `@axe-core` e cospe o JSON com a pontuação WCAG 2.1 AA para persistência no banco. | CP-002 | Alta | ⏳ Pendente |
| **QA-002** | Testes | Storybook (camada 2 da estratégia de QA): playground por componente, uma story por variante/estado de prop, addon de a11y (axe-core) e addon de interação (`@storybook/test`, Play function com teclado/clique real). | QA-001 | Média | ⏳ Pendente |
| **QA-003** | Testes | Cypress (camada 3 da estratégia de QA): fluxo real de UI/UX em navegador de verdade, fecha a lacuna de interação que Playwright puro não cobre. | QA-002 | Alta | ⏳ Pendente |

---

## 📈 Métricas de Progresso
*   **Total de Tarefas:** 17
*   **Concluídas:** 3 (HN-001, QG-001, QG-002)
*   **Em andamento:** 2 (CP-001, CP-002)
*   **Complexidade Crítica / Alta:** 9
*   **Estimativa de Esforço Base:** 160h-220h de engenharia focada (não recalculado desde a adição de HN-001/QG-001/QG-002/QA-002/QA-003 — revisar na próxima rodada de planejamento).
