# Spec — Component Showcase (`component-showcase-spec`)

## Context
`app/frontend` — Astro app that mounts compiled components as React **and** Vue islands side by side. Distinct from `QA-002` (Storybook, per-component dev playground): this is a real multi-framework page, built specifically to answer "does mixing React and Vue islands in one Astro page distort anything?" empirically instead of asserting it away.

## Structure
- `app/frontend/src/layouts/ShowcaseLayout.astro` — imports `compiler/theme/tokens.css` directly (source file, not the gitignored `compiler/out/_theme/` copy).
- `app/frontend/src/pages/index.astro` — imports compiled output straight from `compiler/out/<Name>/{react,vue,astro}/` via relative path (same cross-project convention `qa/src/run.ts` already uses).
- Static/non-interactive components render via their `.astro` output directly, no island. Interactive components render **both** a React-hydrated (`client:load`) and a Vue-hydrated (`client:load`) instance in the same section, fed the same `example` prop values already declared in `compiler/examples/*.ast.json`.
- `astro.config.mjs` aliases `vue`/`react`/`react-dom` to this project's own `node_modules` — required because components import from `compiler/out/`, a different project root with no `node_modules` of its own; Vite's default bare-import resolution walks up from the *importing file's* directory and can't find these there otherwise (confirmed by testing: build failed with "Failed to resolve import 'vue'" without the alias).

## Why cross-framework visual distortion isn't expected — verified, not assumed
- All three compiled targets (react/vue/astro) emit the identical `style` text sourced from the same AST — no scoped CSS, no framework-specific class injection. `theme-spec.md`'s `--br-*` custom properties resolve identically regardless of which framework mounted the DOM node.
- Astro's React and Vue integrations each mount into their own isolated DOM subtree — no shared reconciliation between them.
- **Confirmed empirically**, not just architecturally: built the real page (`astro build` + `astro preview`), loaded it in headless Chromium (Playwright, reusing `qa/`'s dependency), clicked the real React **and** real Vue instances of `Counter` (state `0→1` both) and `SaveStatus` (`""→"Saved!"` both) — identical behavior, **zero console errors or warnings** after the fixes below.

## Real bugs found while building this (not hypothetical — confirmed by actually running the code)

1. **React `style` string prop.** `componentToReact()`'s output used `style="css text"` as a literal JSX attribute. React's DOM `style` prop requires an object — a string throws `Error: The style prop expects a mapping from style properties to values, not a string` at render time. Never caught before: prior verification only ever read generated code as text or ran axe-core against static HTML, neither of which invokes React's actual runtime. **Fix**: `compiler/src/ast-to-mitosis.ts`'s `splitAttributes` now converts a literal `style` string into an object-expression binding (`cssTextToStyleObjectSource`) instead of leaving it as a raw property — React now emits `style={{...}}`; Vue is unaffected either way (its `:style` binding accepts object or string identically). Retroactive across every fixture on recompile, no AST/fixture changes needed. **Known residual gap, not fixed**: a *dynamic* `style` (`{ bind: <ternary expression> }`, used by `Container`/`Separator`/`Drawer` once `CMP-L1` merges) goes through a different code path (the `isBinding` branch) and still hits this bug in React — fixing that needs a runtime helper (can't statically parse an arbitrary expression at compile time), tracked as a new Worklist item, not solved here.
2. **Vue `focusOnShow` crashes during SSR.** The generated `watch(..., { immediate: true })` fires eagerly at component creation — including server-side, where `$refs` are never populated (no real DOM exists yet). Calling `.focus()` on `undefined` threw `TypeError: Cannot read properties of undefined (reading 'focus')` the moment a `show.focusOnShow` component was actually server-rendered by a real framework (Astro SSRs every island by default, even `client:load` ones — never exercised before, same root cause as bug 1: prior checks never ran a real SSR pipeline). **Fix**: `compiler/src/ast-to-mitosis.ts`'s `focusOnShow` codegen now guards the ref (`${bindExpr} && ${refName}`) before calling `.focus()` — harmless no-op for React (whose `useEffect` never runs during SSR at all, so it was never affected), fixes Vue's eager SSR watcher.

Both fixes are shared codepaths (`astToMitosisComponent`/`splitAttributes`, used by every target) — verified via full QA-001 regression (`qa/dist/run.js`) after each fix, 0 new violations.

## Non-goals (this version)
- No visual regression screenshot diff yet (Playwright is already a dependency via `qa/` and this spec's own manual verification — automating a pixel diff between the React/Vue instance of each component is a natural follow-up, not built this round).
- No production build/deploy for this app yet — local `astro dev`/`astro build`/`astro preview` only.
- The dynamic-`style` React bug (residual gap above) is tracked, not fixed.
