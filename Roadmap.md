# 🗺️ Roadmap de Engenharia de Longo Prazo — Beaconray Studio

Este documento estabelece os marcos de engenharia estruturais e as metas arquiteturais de curto, médio e longo prazo do ecossistema Beaconray.

Ordem de construção: **Mitosis/Componentes primeiro**, backend depois (ADR-002 em `.specs/ADRS.md`) — o resto do sistema é construído em torno dos componentes que o compiler produzir, não o contrário.

---

## 🧬 Gate de Qualidade & Estratégia de QA (transversal — vale pra todo componente, em qualquer fase)

Todo componente que sair do compiler precisa satisfazer (`.specs/component-quality-spec.md`):
*   **HTML5 semântico** — tag corresponde ao papel real, nunca `div`/`span` com evento sem `role` explícito.
*   **WCAG 2.2 AA** — nome acessível em todo elemento interativo, `alt` em imagem, sem `tabindex` positivo, rótulo em todo campo de formulário. Mapa completo dos 24 critérios exclusivos de AA (2.1+2.2) documentado — o que é responsabilidade do compiler vs. o que é responsabilidade do Studio/app (navegação do site, fluxos de formulário, mídia) fica explícito, não presumido.
*   **Acesso multi-modal obrigatório** — operável por teclado, endereçável por controle de voz e leitor de tela; nada depende só de mouse/toque.
*   **Performance / ultra leve** — orçamento de bundle por componente, zero dependência de runtime além do framework alvo.
*   **Animação configurável via tokens** — nunca hardcodar duração/easing, sempre referenciar tema central (estilo Tailwind `@theme`); respeita `prefers-reduced-motion`.
*   **SEO & GEO** — output estático (Astro/`qa-html`) renderiza texto de verdade já embutido no HTML (via `componentToTemplate` + valores de exemplo), não injetado por JS depois do load; todo `<a>` com `href` real. Sem isso, crawler de busca e de LLM não veem conteúdo nenhum.

Verificação em 3 camadas (`.specs/component-qa-strategy-spec.md`, documentado, implementação entra conforme o sistema cresce): **Playwright + axe-core** (auditoria WCAG automatizada, já rodando local contra `Button`/`Counter`) → **Storybook** (playground por componente, addon de a11y/interação) → **Cypress** (fluxo real de UI/UX em navegador de verdade).

**Direção futura (não construída ainda):** auditoria de SEO/GEO/WCAG como feature da plataforma — usuário aponta uma URL de qualquer site/componente/app (não só output do nosso compiler) e recebe o feedback pela plataforma. Hoje o QA-001 só audita o output local do compiler; generalizar pra URL arbitrária é rastreado em `.specs/qa-automation-spec.md`.

---

## 📍 Fase 1: Compiler & Componentes — Mitosis (Q3 2026)
**Foco:** Sair de AST agnóstico de framework pra código nativo React/Vue/Astro, com o gate de qualidade acima valendo desde o primeiro componente.

*   **Piloto já validado:** AST v1 (`.specs/ast-component-spec.md` — props/atributos/texto + state/eventos/condicional/loop) → `.lite.tsx`/react/vue/astro via `@builder.io/mitosis`, testado ponta a ponta com fixtures `Button`/`Counter`. Astro sem gerador nativo na versão pinada — output estático via `componentToTemplate` (texto real embutido, sem gerador Astro nativo).
*   **Julho/2026 — Parser JSON para Mitosis (AST v1):** expandir o AST pra state, eventos, condicionais (`Show`) e loops (`For`) — sai de "botão estático" pra componente real. Isolamento do processo de compilação em containers/workers temporários controlados por filas prioritárias no Redis quando o volume justificar.
*   **Agosto/2026 — Multi-Framework Target consolidado:** geradores React/Vue/Astro estáveis pros 4 tipos de nó do AST v1, tarball (`.tar.gz`) segmentado por framework pronto pra distribuição futura via CLI/registry.

## 🎨 Fase 2: Mecanismo de Design Semântico (Studio & Canvas Engine) (Q4 2026)
**Foco:** Construir a interface visual de alta fidelidade que produza o **mesmo formato de AST** que o compiler da Fase 1 já consome — sem atalho específico de Studio no formato.

*   **Setembro/2026 — Construtor de Layouts (Elementor-like):** Canvas interativo em React com Isolamento de Iframe (Sandbox), `@dnd-kit/core` com drag-and-drop acionado por teclado, atualizando a árvore de acessibilidade (AOM) em tempo real.
*   **Outubro/2026 — Painel de Controle Atômico (Figma-like):** editor de propriedades mapeando WAI-ARIA states (`aria-expanded`, `aria-controls`, `aria-live`) direto pro AST; motor de resolução de classes Tailwind v4.0 `@theme` alimentando os tokens de animação/tema definidos na Fase 1.

## ⚙️ Fase 3: Kernel do Sistema & Infraestrutura de Distribuição (Q1 2027)
**Foco:** Backend, armazenamento e protocolo CLI — entra depois de já existir compiler + Studio produzindo componentes reais.

*   **Novembro/2026 — Modelagem de Dados e Armazenamento Distribuído:** desenho e indexação das tabelas Postgres (particionamento por ID de usuário), schema `jsonb` estrito com validação via JSON Schema pra AST dos componentes, cluster MinIO com IAM rígido e Pre-signed URLs (expiração 180s).
*   **Dezembro/2026 — Engine de Autenticação e Protocolo CLI:** backend em **Symfony** (troca de Laravel — ADR-003 em `.specs/ADRS.md`), fluxo OAuth2 pra autenticação em terminal via `npx beaconray login` (rotas de callback locais em portas efêmeras); instalador da CLI autodetectando framework do projeto (`package.json`/`tsconfig.json`/estrutura Vite/Next/Nuxt).

## 🚀 Fase 4: Governança, Escopo e Análises (Q2 2027)
**Foco:** Monitoramento, monetização e infraestrutura Enterprise.

*   **Janeiro/2027 — Registro Escopado Privado:** suporte a múltiplos escopos NPM (`@beaconray/username-component`), silos fechados de componentes por empresa/time na mesma base Symfony.
*   **Fevereiro/2027 — Telemetria e Analytics de Interface:** coletores de log no Symfony pra rastrear downloads de pacotes da CLI, relatórios de volumetria e uso de banda por usuário.
