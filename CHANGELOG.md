# 13-08-2026
## Spec-driven harness setup
### pr
https://github.com/justgu1/beaconray/pull/1
### done
Installed the project's spec-driven harness: `AGENTS.md` (lean YAML), `.specs/SPECS.md`, `.specs/SKILLS.md`, `.specs/skills/`, `.specs/ADRS.md`. Logged 4 ADRs (spec-driven harness, Mitosis-first build order, backend swap Laravel→Symfony, hand-authored pilot AST). Installed always-on caveman mode rules in `.cursor/rules/caveman.mdc`, `.windsurf/rules/caveman.md`, `.clinerules/caveman.md`, `.github/copilot-instructions.md`.

Added `.specs/ast-component-spec.md` and `.specs/mitosis-compiler-spec.md`, then built the `/compiler` package (TypeScript, `@builder.io/mitosis@0.14.0`): `ast-to-mitosis.ts` maps our component AST onto Mitosis's node tree via `createMitosisNode`, `compile.ts` drives `componentToMitosis`/`componentToReact`/`componentToVue` plus a manual Astro shell over `componentToHtml` (no native Astro target in this Mitosis version). Verified end-to-end against a hand-authored `Button` fixture (`compiler/examples/button.ast.json`, test fixture only, not the official pilot) — all 4 outputs generated correctly, react output passes `tsc --noEmit` (only unresolved-module noise for `react`, no syntax errors).

Synced `Roadmap.md`, `README.md`, `Worklist.md` with decisions made so far: backend Laravel → Symfony everywhere (ADR-003), phase order flipped to Mitosis/components-first (ADR-002, Fase 1 is now Compiler & Componentes, backend moved to Fase 3), `Worklist.md` dependencies updated (CP-001 no longer depends on ST-002, CP-001/CP-002 marked in progress), added `HN-001`/`QG-001`/`QG-002` rows and `QA-002`/`QA-003` (Storybook, Cypress) rows.

Added the mandatory component quality gate: `.specs/component-quality-spec.md` (semantic HTML5, WCAG 2.1 AA, mandatory multi-modal access, performance budget, animation-via-tokens), `.specs/component-qa-strategy-spec.md` (3-layer QA: Playwright+axe-core → Storybook → Cypress, documented only, not implemented), `.specs/skills/component-quality-checklist.md`. Logged ADR-005. 12 files touched this session in total.
