# 13-08-2026
## Spec-driven harness setup
### pr
https://github.com/justgu1/beaconray/pull/1
### done
Installed the project's spec-driven harness: `AGENTS.md` (lean YAML), `.specs/SPECS.md`, `.specs/SKILLS.md`, `.specs/skills/`, `.specs/ADRS.md`. Logged 4 ADRs (spec-driven harness, Mitosis-first build order, backend swap Laravel→Symfony, hand-authored pilot AST). Installed always-on caveman mode rules in `.cursor/rules/caveman.mdc`, `.windsurf/rules/caveman.md`, `.clinerules/caveman.md`, `.github/copilot-instructions.md`.

Added `.specs/ast-component-spec.md` and `.specs/mitosis-compiler-spec.md`, then built the `/compiler` package (TypeScript, `@builder.io/mitosis@0.14.0`): `ast-to-mitosis.ts` maps our component AST onto Mitosis's node tree via `createMitosisNode`, `compile.ts` drives `componentToMitosis`/`componentToReact`/`componentToVue` plus a manual Astro shell over `componentToHtml` (no native Astro target in this Mitosis version). Verified end-to-end against a hand-authored `Button` fixture (`compiler/examples/button.ast.json`, test fixture only, not the official pilot) — all 4 outputs generated correctly, react output passes `tsc --noEmit` (only unresolved-module noise for `react`, no syntax errors).

Synced `Roadmap.md`, `README.md`, `Worklist.md` with decisions made so far: backend Laravel → Symfony everywhere (ADR-003), phase order flipped to Mitosis/components-first (ADR-002, Fase 1 is now Compiler & Componentes, backend moved to Fase 3), `Worklist.md` dependencies updated (CP-001 no longer depends on ST-002, CP-001/CP-002 marked in progress), added `HN-001`/`QG-001`/`QG-002` rows and `QA-002`/`QA-003` (Storybook, Cypress) rows.

Added the mandatory component quality gate: `.specs/component-quality-spec.md` (semantic HTML5, WCAG 2.1 AA, mandatory multi-modal access, performance budget, animation-via-tokens), `.specs/component-qa-strategy-spec.md` (3-layer QA: Playwright+axe-core → Storybook → Cypress, documented only, not implemented), `.specs/skills/component-quality-checklist.md`. Logged ADR-005. 12 files touched this session in total.

# 13-08-2026
## AST v1: state, events, conditionals, loops + static quality-gate enforcement
### pr
https://github.com/justgu1/beaconray/pull/2
### done
Extended `.specs/ast-component-spec.md` to v1 (additive, v0 stays valid): `state`, event attributes (`{ on: expr }`), conditional nodes (`{ show: {...} }`), loop nodes (`{ for: {...} }`) — all mapped 1:1 to Mitosis 0.14.0's internal conventions, verified by manual testing (`state` shape comes from `useStore`, not `useState`; events use `bindingType: 'function'`; conditionals/loops use the built-in `Show`/`For` node names). Updated `.specs/mitosis-compiler-spec.md` with the mapping rules and a new "Quality-gate validation" section. Logged ADR-006.

Updated `/compiler`: `types.ts` (new `StateVar`/`ShowNode`/`ForNode` types, `isNativeInteractiveTag` guard), `ast-to-mitosis.ts` (state/event/show/for mapping), `validate.ts` (now enforces the statically-checkable quality-gate rules from `component-quality-spec.md` — event binding needs a native interactive tag or explicit `role`, interactive elements need an accessible name, `img` needs `alt`, no positive `tabindex` — a violation aborts compilation with a clean message, verified against a deliberately bad fixture). `compile.ts` now catches parse/validation errors cleanly instead of dumping a raw stack trace.

New fixture `compiler/examples/counter.ast.json` exercises all 4 new AST v1 features at once. Verified end-to-end: all 4 outputs (`.lite.tsx`/react/vue/astro) generated correctly — React uses `useState`, Vue uses `v-if`/`v-for`, Astro's `componentToHtml` handles `Show`/`For` without breaking. Re-ran the existing `Button` fixture (v0) to confirm no regression. `tsc --noEmit` on generated React output passes (same expected `react`-module-not-found noise, no syntax errors).

# 13-08-2026
## QA-001: Playwright + axe-core WCAG 2.1 AA audit
### pr
https://github.com/justgu1/beaconray/pull/3
### done
Added `.specs/qa-automation-spec.md` (QA-001, layer 1 of `component-qa-strategy-spec.md`) and logged ADR-007: QA-001 tests the compiler's framework-agnostic HTML output (`componentToHtml`), not React/Vue rendering — avoids needing a bundler/JSX runtime at test time, at the documented cost of not catching framework-specific rendering bugs.

`compile.ts` gained a 5th target, `qa-html` — wraps `componentToHtml()`'s output in a minimal standalone document (`<html lang="en">`, `<title>`, both required or axe-core flags document-level noise unrelated to the component). New `/qa` package (`playwright@1.62.1`, `@axe-core/playwright@4.13.0`): `run.ts` opens each `compiler/out/*/qa/*.html` in headless Chromium, runs `AxeBuilder({ page }).withTags([wcag2a, wcag2aa, wcag21a, wcag21aa]).analyze()` (confirmed API needs `browser.newContext()` — `browser.newPage()` directly throws), writes a JSON report per component, exits non-zero on any violation.

Verified end-to-end: `Button` and `Counter` (the two existing fixtures) both pass with 0 WCAG 2.1 AA violations. Confirmed the runner actually fails when it should (deliberately bad fixture: image without `alt`, button without a name → 2 violations, exit 1, both reported) and hard-errors on a requested-but-missing component (not a silent skip). `Worklist.md` QA-001 marked done (local-only — no CI wiring, no backend to persist reports to yet, both explicit non-goals for this round).

Asked to guarantee all 24 AA-exclusive WCAG success criteria (2.1 + 2.2 combined) are covered. Logged ADR-008: bumped the stated target from 2.1 to 2.2 AA (strict superset) and added a full 24-criteria mapping table to `component-quality-spec.md` — each one tagged with its real applicable layer (component/AST-static, component/axe-automated, tracked-gap-pending-AST-feature, or explicitly out of scope for a component compiler — site navigation, media captions, login flows, and similar app/content-level concerns can't be satisfied by a single component's AST no matter how the compiler is built). Implemented what's cheaply automatable now: `wcag22aa` axe tag added to the QA-001 runner (pulls in SC 2.5.8 `target-size`), plus a new reflow check (SC 1.4.10 — resize to 320×640, assert no forced horizontal scroll via `document.documentElement.scrollWidth`). Verified the reflow check actually catches a genuinely too-wide fixture (908px content at a 320px viewport → fail, exit 1) as well as passing fixtures. `Button`/`Counter` still pass clean under the expanded tag set.

# 13-08-2026
## SEO & GEO: genuinely static render, `<a href>` rule, future URL-audit direction noted
### pr
https://github.com/justgu1/beaconray/pull/3
### done
Asked to make components "SEO perfect and GEO perfect." Found a real problem: the Astro/`qa-html` output (`componentToHtml`) renders empty `data-el` placeholders whose text gets filled by an injected `<script>` after load — invisible to crawlers that don't run JS (true of most search crawlers, and effectively all LLM/AI-answer-engine crawlers today). Logged ADR-009: switched both static targets to `componentToTemplate()` instead — confirmed by manual testing (including with `Show`/`For`/`state`) that it generates a plain JS function whose *source* renders real baked HTML when executed with example props.

Since `componentToTemplate` returns generator source, not a callable value, added `compiler/src/render-static.ts`: transforms the source (`export default function` → `module.exports =`), writes it to a throwaway temp file, `require()`s it, calls it with example prop values. New optional `example` field on `ComponentProp` (`ast-component-spec.md` v1.1) feeds those values — falls back to an empty/zero/false value per type when absent. Added fixtures' `example` values (`Button`: "Click me"/false/"primary", `Counter`: `["Apple", "Banana"]` for `items` — flagged as a known pre-existing type-system gap, `PropType` doesn't model lists yet, tracked not fixed). Added a `validate.ts` rule: every `a` needs `href`.

Verified end-to-end: `Button`/`Counter` astro output now shows real baked text (`<button aria-label="Click me" ...>Click me</button>`, `<li>Apple</li><li>Banana</li>`) with zero `<script>` tag. QA-001 re-run clean (0 violations, reflow OK) against the new static markup. `href` rule verified against a deliberately bad fixture (link with no `href` → abort, clean error). Found and documented (not fixed) a real quirk: `componentToTemplate` serializes `disabled={false}` as the literal HTML attribute `disabled="false"`, which per HTML boolean-attribute semantics is still truthy — a real fidelity gap in Mitosis's generator, tracked in `mitosis-compiler-spec.md`, not silently accepted as correct. Documented the static output's interactivity trade-off (no client JS = inert buttons/handlers in that output; React/Vue remain the interactive targets).

Noted for later, not built this round: structured data (schema.org JSON-LD, `Worklist.md` SEO-002) and the product direction to offer SEO/GEO/WCAG auditing as a platform feature against **any** URL (external sites/components/apps), not just the compiler's own output (`QA-004`, tracked in `qa-automation-spec.md`'s "Future direction" section and `Roadmap.md`).

# 13-08-2026
## Beaconray Theme: Royal Cyan palette, Atkinson Hyperlegible, CSS-agnostic tokens, mandatory responsiveness
### pr
TBD (no PR yet — local work)
### done
Rejected a Tailwind-`@theme`-based token mechanism (previous draft direction) in favor of a fully CSS-agnostic one — plain CSS custom properties, zero framework coupling in the core. Logged ADR-010: new `.specs/theme-spec.md` defines the **Beaconray Theme**, the platform's default token catalog — color, typography, spacing/sizing, animation, focus-visibility, and mandatory responsiveness, explicitly as a generic mechanism ("anything CSS-related becomes a token"), not a closed 4-category list.

Color palette "Royal Cyan" (`#056583`/`#37849c`/`#69a3b5`/`#9bc1cd`/`#cde0e6`) and typeface Atkinson Hyperlegible (chosen after explicitly rejecting Inter as "too generic") were given as the platform defaults. Computed real WCAG contrast ratios (relative-luminance formula, via `node`) for every role assignment before writing them into the spec — found `#056583` passes 6.57:1 as both text-on-white and button-background-with-white-text, but is too weak in dark mode (3.01:1) so `#69a3b5` (7.08:1) takes over as dark-mode primary; adjacent Royal Cyan steps have too little mutual contrast (~1.4–1.5:1) to pair as border/surface without skipping steps. Added `--br-color-on-primary` (text-on-primary-background token) after realizing the first fixture draft would have hardcoded `#fff` — verified separately per light/dark mode since white text fails outright (2.80:1) against the dark-mode primary.

This also closes WCAG SC 2.4.7 (Focus Visible), previously marked "tracked — add when style tokens land" in the ADR-008 criteria map, via a global `:focus-visible` rule using the verified focus-ring token.

Added `compiler/theme/tokens.css` (the actual CSS file: `:root` block, `prefers-color-scheme: dark` override, `prefers-reduced-motion` override, global `:focus-visible`, `overflow-wrap: break-word` baseline). `compile.ts` now copies it once per run to `compiler/out/_theme/tokens.css` and links it from the `qa-html` document's `<head>` — without that link, `var(--br-*)` in a component's `style` wouldn't resolve to anything and axe's contrast checks would have nothing real to evaluate. `validate.ts` gained enforcement for raw color, raw time, and fixed-pixel width/height in `style` (all reject compilation, same severity as other quality-gate rules) — verified against two deliberately bad fixtures.

Found, mid-verification, that axe's `color-contrast` rule was reporting `inapplicable` rather than passing on the `Button` fixture — traced it to the previously-documented-but-unfixed `disabled="false"` boolean-attribute quirk (ADR-009): axe excludes disabled elements from contrast checks entirely, so the bug was silently defeating the very verification this round exists to provide. Fixed it this time (`render-static.ts`, `fixBooleanAttributes`) rather than leaving it as a permanent documented gap, since it was actively masking a real check. Re-verified: `color-contrast` now genuinely passes, axe-measured ratio `6.57:1` — matches the hand-computed value exactly.

Updated `component-quality-spec.md` rule 5 (animation-only → generic theming) and added rule 8 (mandatory responsiveness). `Worklist.md` gained `THEME-001` (done) and `PLAT-001` (pending, future — see below). `Roadmap.md`'s Tailwind mentions (Fase 2) corrected to reflect the CSS-agnostic core.

Also registered, not built, per a mid-round product idea: a future public marketplace for sharing themes/components (own repo or Studio-authored) with GitHub-style social ranking (stars, comments) — `Worklist.md` `PLAT-001`, `Roadmap.md` Fase 4 (Março/2027). The token-file theme architecture built this round is deliberately what would make a theme cleanly publishable later — swapping a theme never touches component code.
