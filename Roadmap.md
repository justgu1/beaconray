# 🗺️ Roadmap de Engenharia de Longo Prazo — Beaconray Studio

Este documento estabelece os marcos de engenharia estruturais e as metas arquiteturais de curto, médio e longo prazo do ecossistema Beaconray.

Ordem de construção: **Mitosis/Componentes primeiro**, backend depois (ADR-002 em `.specs/ADRS.md`) — o resto do sistema é construído em torno dos componentes que o compiler produzir, não o contrário. **Correção (ADR-015):** o "depois" da Fase 3 foi puxado pra agora — o backend (`BK-001`..`BK-005`, `app/backend`) começou a ser construído em paralelo ao avanço da Camada 2/3 de componentes, não estritamente depois. CLI e Studio continuam depois.

---

## 🧬 Gate de Qualidade & Estratégia de QA (transversal — vale pra todo componente, em qualquer fase)

Todo componente que sair do compiler precisa satisfazer (`.specs/component-quality-spec.md`):
*   **HTML5 semântico** — tag corresponde ao papel real, nunca `div`/`span` com evento sem `role` explícito.
*   **WCAG 2.2 AA** — nome acessível em todo elemento interativo, `alt` em imagem, sem `tabindex` positivo, rótulo em todo campo de formulário. Mapa completo dos 24 critérios exclusivos de AA (2.1+2.2) documentado — o que é responsabilidade do compiler vs. o que é responsabilidade do Studio/app (navegação do site, fluxos de formulário, mídia) fica explícito, não presumido.
*   **Acesso multi-modal obrigatório** — operável por teclado, endereçável por controle de voz e leitor de tela; nada depende só de mouse/toque.
*   **Performance / ultra leve** — orçamento de bundle por componente, zero dependência de runtime além do framework alvo.
*   **Beaconray Theme — tokens via CSS puro** — nunca hardcodar cor/fonte/espaço/duração/easing; sempre `var(--br-*)`, custom properties puras, zero dependência de Tailwind ou qualquer lib CSS no núcleo (`.specs/theme-spec.md`). Paleta Royal Cyan + fonte Atkinson Hyperlegible, contraste verificado matematicamente (não assumido). Responsividade 100% obrigatória por padrão. Respeita `prefers-reduced-motion`.
*   **SEO & GEO** — output estático (Astro/`qa-html`) renderiza texto de verdade já embutido no HTML (via `componentToTemplate` + valores de exemplo), não injetado por JS depois do load; todo `<a>` com `href` real. Sem isso, crawler de busca e de LLM não veem conteúdo nenhum.

Verificação em 3 camadas (`.specs/component-qa-strategy-spec.md`, documentado, implementação entra conforme o sistema cresce): **Playwright + axe-core** (auditoria WCAG automatizada, já rodando local contra `Button`/`Counter`) → **Storybook** (playground por componente, addon de a11y/interação) → **Cypress** (fluxo real de UI/UX em navegador de verdade).

**Direção futura (não construída ainda):** auditoria de SEO/GEO/WCAG como feature da plataforma — usuário aponta uma URL de qualquer site/componente/app (não só output do nosso compiler) e recebe o feedback pela plataforma. Hoje o QA-001 só audita o output local do compiler; generalizar pra URL arbitrária é rastreado em `.specs/qa-automation-spec.md`.

---

## 📍 Fase 1: Compiler & Componentes — Mitosis (Q3 2026)
**Foco:** Sair de AST agnóstico de framework pra código nativo React/Vue/Astro, com o gate de qualidade acima valendo desde o primeiro componente.

*   **Piloto já validado:** AST v1 (`.specs/ast-component-spec.md` — props/atributos/texto + state/eventos/condicional/loop) → `.lite.tsx`/react/vue/astro via `@builder.io/mitosis`, testado ponta a ponta com fixtures `Button`/`Counter`. Astro sem gerador nativo na versão pinada — output estático via `componentToTemplate` (texto real embutido, sem gerador Astro nativo).
*   **Julho/2026 — Parser JSON para Mitosis (AST v1):** expandir o AST pra state, eventos, condicionais (`Show`) e loops (`For`) — sai de "botão estático" pra componente real. Isolamento do processo de compilação em containers/workers temporários controlados por filas prioritárias no Redis quando o volume justificar.
*   **Agosto/2026 — Multi-Framework Target consolidado:** geradores React/Vue/Astro estáveis pros 4 tipos de nó do AST v1, tarball (`.tar.gz`) segmentado por framework pronto pra distribuição futura via CLI/registry.
*   **Catálogo de Componentes v1 (`.specs/component-catalog-spec.md`):** lista fechada de 34 componentes em 3 camadas — 5 estruturais (`Card`, `Container`, `Separator`, `Drawer`, `Modal`), 18 interativos (`Link`, `Button`, `Input`, `Switcher`, `Dropdown`, `Date Picker`, `Accordion`, `Popover`, `Toast`, `Tooltip`, `Breadcrumb`, `Paginator`, `Avatar`, `Badge`, `Progress`, `Spinner`, `File Upload`, `Color Picker`), 11 complexos construídos em cima da base (`Text Editor`, `Carousel`, `DataTable`, `Stepper`, `Chart`, `Navbar`, `Resizable`, `Tabs`, `Tree View`, `Command Palette`, `Calendar`). Objetivo: montar site/app/sistema inteiro só com esses componentes. Construção de cada um é trabalho futuro (`Worklist.md` `CMP-L1`/`CMP-L2`/`CMP-L3`), não desta fase de catálogo.

## 🎨 Fase 2: Mecanismo de Design Semântico (Studio & Canvas Engine) (Q4 2026)
**Foco:** Construir a interface visual de alta fidelidade que produza o **mesmo formato de AST** que o compiler da Fase 1 já consome — sem atalho específico de Studio no formato.

*   **Setembro/2026 — Construtor de Layouts (Elementor-like):** Canvas interativo em React com Isolamento de Iframe (Sandbox), `@dnd-kit/core` com drag-and-drop acionado por teclado, atualizando a árvore de acessibilidade (AOM) em tempo real.
*   **Outubro/2026 — Painel de Controle Atômico (Figma-like):** editor de propriedades mapeando WAI-ARIA states (`aria-expanded`, `aria-controls`, `aria-live`) direto pro AST; editor visual do Beaconray Theme (`.specs/theme-spec.md`) consumindo os tokens CSS puros definidos na Fase 1 — sem depender de Tailwind (decisão que substitui a menção anterior a "Tailwind v4.0 `@theme`" nesta linha; Studio pode oferecer Tailwind como opção de autoria por cima, não como núcleo).

## ⚙️ Fase 3: Kernel do Sistema & Infraestrutura de Distribuição (adiantada pra agora — ADR-015)
**Foco:** Backend, armazenamento e protocolo CLI. Originalmente planejada pra depois do Studio existir; puxada pra agora (`app/backend`, ver `.specs/backend-architecture-spec.md`) — CLI (`CLI-001`/`002`) e Studio (`ST-001`/`002`) continuam pendentes, só o backend adiantou.

*   **Modelagem de Dados e Armazenamento** (`BK-001`): tabelas Postgres (`users`, `libraries`, `versions`, `audit_logs`), schema `jsonb` estrito com validação via JSON Schema pra AST dos componentes (`.specs/schemas/component-ast.schema.json`, `BK-002`), MinIO com Pre-signed URLs (expiração 180s, `BK-003`). Particionamento por ID de usuário fica pra quando o volume justificar (não implementado agora, ver `.specs/backend-architecture-spec.md` non-goals).
*   **Engine de Autenticação e Protocolo CLI** (`BK-005`): backend em **Symfony** (ADR-003), estrutura flat idiomática Symfony/API Platform — sem módulos de domínio (ADR-017); fluxo OAuth2 pra autenticação em terminal via `npx beaconray login` (`league/oauth2-server-bundle`, ADR-016); instalador da CLI autodetectando framework do projeto fica em `CLI-001`, ainda pendente.

## 🚀 Fase 4: Governança, Escopo e Análises (Q2 2027)
**Foco:** Monitoramento, monetização e infraestrutura Enterprise.

*   **Janeiro/2027 — Registro Escopado Privado:** suporte a múltiplos escopos NPM (`@beaconray/username-component`), silos fechados de componentes por empresa/time na mesma base Symfony.
*   **Fevereiro/2027 — Telemetria e Analytics de Interface:** coletores de log no Symfony pra rastrear downloads de pacotes da CLI, relatórios de volumetria e uso de banda por usuário.
*   **Março/2027 — Marketplace Público de Temas & Componentes:** publicação pública de temas/componentes (via CLI a partir do repo do usuário, ou direto do Studio), ranking social (estrelas, comentários, downloads) estilo GitHub — estende o registro escopado privado acima com uma camada pública (`Worklist.md` `PLAT-001`).

**Modelo de monetização (decidido, não implementado):** por projeto/uso, não por camada de componente — trial libera 1 projeto grátis, cobra se o usuário quiser usar os componentes Beaconray em mais de um projeto. A separação base (`.specs/component-catalog-spec.md` Camadas 1-2) vs. complexo (Camada 3) é só arquitetural (complexo construído em cima da base), **não** é fronteira comercial — decisão revisada explicitamente nesta rodada, não confundir as duas coisas depois (ADR-012 em `.specs/ADRS.md`).
