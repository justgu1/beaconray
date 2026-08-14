# Specs Index

| Path | Description |
|---|---|
| .specs/ADRS.md | Architecture decision records log |
| .specs/ast-component-spec.md | Formato do AST de componente (framework-agnostic) |
| .specs/mitosis-compiler-spec.md | Pipeline AST → .lite.tsx → react/vue/astro via Mitosis |
| .specs/component-quality-spec.md | Gate obrigatório de qualidade: HTML5 semântico, WCAG 2.1 AA, multi-modal, performance, tokens de animação |
| .specs/component-qa-strategy-spec.md | Estratégia de QA em 3 camadas: Playwright+axe-core, Storybook, Cypress |
| .specs/qa-automation-spec.md | QA-001: Playwright+axe-core contra o output HTML do compiler |
| .specs/theme-spec.md | Beaconray Theme: paleta Royal Cyan, fonte Atkinson Hyperlegible, tokens genéricos de CSS, responsividade obrigatória |
| .specs/component-catalog-spec.md | Catálogo v1 (34 componentes, 3 camadas) + convenção de padrão por categoria |
| .specs/backend-architecture-spec.md | Backend Symfony (`app/backend`): estrutura flat, BK-001..005 |
| .specs/versioning-spec.md | Modelo de versionamento de `Library`/`Version` (semver explícito, imutável, ponteiro `current`) |
| .specs/schemas/component-ast.schema.json | JSON Schema do AST — fonte única validada pelo BK-002 |
| .specs/component-showcase-spec.md | `app/frontend`: showcase Astro com islands React/Vue lado a lado, 2 bugs reais de SSR achados e corrigidos |
