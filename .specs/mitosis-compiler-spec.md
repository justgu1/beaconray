# Spec — Mitosis Compiler (`mitosis-compiler-spec`)

## Context
Prototype pipeline (equivalent to CP-001 + CP-002 in `Worklist.md`, without depending on Postgres): converts a component AST (`ast-component-spec.md`) into code for multiple frameworks, via Mitosis (`@builder.io/mitosis`, pinned version `0.14.0`).

## Input
A `*.ast.json` file following `ast-component-spec.md`.

## Steps

1. **Parse + minimal validation** of the AST JSON (checks `name`, `props[]`, `root` are present; explicit error if missing). v1 additionally validates the quality-gate rules from `component-quality-spec.md` that are mechanically checkable at this stage (see "Quality-gate validation" below).
2. **`astToMitosisComponent(ast)`** — recursively transforms `root` into Mitosis nodes via `createMitosisNode` (API from `@builder.io/mitosis`):
   - Element node → `{ name: tag, properties: {<static attrs>}, bindings: {<attrs with bind>}, children: [...] }`.
   - Literal text node → `{ name: 'div', properties: { _text: <string> }, bindings: {}, children: [] }`.
   - Dynamic text node (`bind`) → `{ name: 'div', properties: {}, bindings: { _text: { code, bindingType: 'expression', type: 'single' } }, children: [] }`.
   - Event attribute (`{ on: code }`) → binding with `bindingType: 'function'` instead of `'expression'` (e.g. `onClick: { code, bindingType: 'function', type: 'single' }`) — verified shape, matches what `parseJsx` produces for a real `onClick={...}` handler.
   - Conditional node (`show`) → `createMitosisNode({ name: 'Show', bindings: { when: { code, bindingType: 'expression', type: 'single' } }, children })` — Mitosis's built-in special node name for conditionals.
   - Loop node (`for`) → `createMitosisNode({ name: 'For', scope: { forName: as }, bindings: { each: { code, bindingType: 'expression', type: 'single' } }, children })` — Mitosis's built-in special node name for loops; `scope.forName` is how the item variable becomes available to bindings inside `children`.
   - Component `state` → populates the component's top-level `state` field: `{ [name]: { code: JSON.stringify(value), type: 'property', propertyType: 'normal' } }` — verified shape (Mitosis's `useStore` hook produces exactly this when parsed via `parseJsx`; `useState` does **not** populate `state` in 0.14.0, so `useStore`'s shape is the one to target). `astToMitosisComponent(ast, opts)` takes an `opts.forStatic` flag (v1.3, ADR-014): `value` is `state[].initial` normally, but `state[].staticValue ?? initial` when `forStatic` is set — see step 6, this is what makes state-gated content crawlable in the static targets without changing the interactive targets' real initial state.
   - `show.focusOnShow` (v1.2) → generates a unique ref name, adds it to `component.refs[refName] = { argument: 'null' }`, adds `ref`/`tabIndex: -1` bindings to the `Show` node's first child (skipped if that child is already natively focusable), and pushes `{ code: "if (${bindExpr}) { ${refName}.focus(); }", deps: "[${bindExpr}]", depsArray: [bindExpr] }` onto `component.hooks.onUpdate` — verified shape (confirmed via manual testing: a `ref` + `onUpdate` with a `deps` array compiles to `useEffect(() => {...}, [deps])` in React and a `computed`+`watch({ immediate: true })` pair in Vue, both of which re-fire on every transition of the dependency, not just on initial mount).
   - Builds the root component: `{ '@type': '@builder.io/mitosis/component', name, inputs: [], state: {...}, refs: {...}, hooks: { onMount: [], onEvent: [], onUpdate: [...] }, children: [mapped root] }` (AST props become the component's typed inputs).
3. **`.lite.tsx` output**: `componentToMitosis()({ component })` → written to `compiler/out/<name>/<name>.lite.tsx`.
4. **React output**: `componentToReact()({ component })` → `compiler/out/<name>/react/<name>.tsx`.
5. **Vue output**: `componentToVue()({ component })` → `compiler/out/<name>/vue/<name>.vue`.
6. **Static render (`render-static.ts`)** — shared by the Astro and `qa-html` outputs, superseding the earlier `componentToHtml` approach (ADR-009): **no native Astro generator** in Mitosis 0.14.0 (`targets` doesn't include `astro`), and `componentToHtml`'s output is client-hydrated (empty `data-el` placeholders filled by an injected `<script>`) — bad for SEO/GEO, since neither search nor LLM crawlers reliably execute JS (`component-quality-spec.md`, rule 6). Instead:
   - `compile.ts` builds **two** Mitosis component objects from the same AST: `component` (`astToMitosisComponent(ast)`, real `initial` state — feeds `.lite.tsx`/react/vue) and `staticComponent` (`astToMitosisComponent(ast, { forStatic: true })`, `staticValue ?? initial` — feeds astro/qa-html only). Added in v1.3/ADR-014 after finding that a single shared component object meant any state-gated content (e.g. `Drawer`/`Modal`'s `open`) was always baked closed in the static output, regardless of what made sense to actually crawl/audit — see `ast-component-spec.md` `state[].staticValue`.
   - `componentToTemplate()({ component: staticComponent })` generates **source code** for a plain JS function (`export default function template(props) { return \`<html string>\`; }`) — confirmed by manual testing, including with `Show`/`For` nodes (renders to a ternary/`.map().join()` respectively) and `state` (baked into the function body as `let state = {...}` from the values already resolved into the component JSON, per the `forStatic` rule above).
   - That source is a code generator output, not a directly-callable value — `render-static.ts` transforms it (`export default function template(` → `module.exports = function template(`), writes it to a throwaway temp file, `require()`s it, and calls the resulting function with example prop values (`ast.props[].example`, falling back to an empty/zero/false value per type when absent — see `ast-component-spec.md`) to get back **real, baked static HTML** — actual tags with actual text, no hydration script needed for content.
   - Trade-off, documented not hidden: the static render has no client-side interactivity (a button's `onClick` does nothing in this output) — see `component-quality-spec.md` rule 7. React/Vue remain the fully-interactive targets.
   - **Generator quirk, now fixed**: `componentToTemplate` serializes a `false` boolean attribute value literally — `disabled={false}` becomes the HTML attribute `disabled="false"`, which per HTML boolean-attribute semantics is still truthy (the browser treats it as disabled regardless of the string value). Confirmed via manual testing on the `Button` fixture, and confirmed it wasn't just cosmetic: a disabled element is excluded from axe-core's `color-contrast` rule entirely (`inapplicable`, not a pass), which was silently defeating the theme-token contrast verification in `theme-spec.md`. Fixed in `render-static.ts` (`fixBooleanAttributes`): strips a boolean attribute entirely when its value is the literal string `"false"`, normalizes `"true"` to the bare attribute, for the common HTML boolean attributes (`disabled`, `checked`, `selected`, `readonly`, `required`, `multiple`, `hidden`).
7. **Astro output**: the baked HTML from step 6, wrapped in a minimal Astro component shell (empty `---\n---` frontmatter) → `compiler/out/<name>/astro/<name>.astro`.
8. **Structured data (`schema`, SEO-002)**: when `ast.schema` is present, `<script type="application/ld+json">${JSON.stringify(ast.schema)}</script>` is appended after the component markup in both static outputs (astro, `qa-html`) — same JSON-LD object, not framework-specific.

## Quality-gate validation (v1)
Mechanically checkable rules from `component-quality-spec.md`, enforced in `validate.ts` before compilation runs — a violation aborts the whole pipeline, same as a structurally invalid AST:
- Rule 1 (semantic HTML5): any node with an event attribute (`{ on: ... }`) must use a native interactive tag (`button`/`a`/`input`/`select`/`textarea`) or declare an explicit `role` attribute.
- Rule 2 (WCAG 2.2 AA): every interactive element needs an accessible name (literal text child, or `aria-label`/`aria-labelledby` attribute); every `img` needs `alt`; no positive `tabindex`.
- Rule 6 (SEO/GEO): every `a` node needs an `href` attribute; `schema`, when present, needs `@context` and `@type`.
- Rule 3 (aria-live, v1.2): a node whose text/attribute binds to `state.*` needs `aria-live` (on itself or an ancestor) unless it's inside (itself or a descendant of) an element with any event binding — heuristic, not full data-flow analysis; see `component-quality-spec.md` rule 3 for the exact reasoning and its limits.
- What's **not** checked here (documented gap, not silently skipped): `prefers-reduced-motion` on animation (covered globally by `theme-spec.md`'s CSS instead, not per-AST), and focus management for `for` (list-item removal) — these need runtime inspection beyond what a `deps`-effect can express, tracked in `ast-component-spec.md`'s non-goals.

## Errors
- Invalid AST (missing required field, or a quality-gate violation above) → aborts with a message pointing at the field/rule.
- A generation failure for one target doesn't abort the others — each output runs isolated, errors are reported per target.

## Verification
- `tsc --noEmit` on generated `.tsx` files (react) — no syntax errors.
- Visual review of generated `.lite.tsx`/`.vue`/`.astro` (prototype stage, no automated test yet).
