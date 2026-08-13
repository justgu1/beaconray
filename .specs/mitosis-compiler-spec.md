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
   - Component `state` → populates the component's top-level `state` field: `{ [name]: { code: String(initial), type: 'property', propertyType: 'normal' } }` — verified shape (Mitosis's `useStore` hook produces exactly this when parsed via `parseJsx`; `useState` does **not** populate `state` in 0.14.0, so `useStore`'s shape is the one to target).
   - Builds the root component: `{ '@type': '@builder.io/mitosis/component', name, inputs: [], state: {...}, children: [mapped root] }` (AST props become the component's typed inputs).
3. **`.lite.tsx` output**: `componentToMitosis()({ component })` → written to `compiler/out/<name>/<name>.lite.tsx`.
4. **React output**: `componentToReact()({ component })` → `compiler/out/<name>/react/<name>.tsx`.
5. **Vue output**: `componentToVue()({ component })` → `compiler/out/<name>/vue/<name>.vue`.
6. **Astro output**: **no native generator** in Mitosis 0.14.0 (`targets` doesn't include `astro` — confirmed by inspecting the package). Workaround: `componentToHtml()({ component })` manually wrapped in an Astro component shell (empty `---\n---` frontmatter + the generated HTML as template) → `compiler/out/<name>/astro/<name>.astro`. Documented as a known limitation, not a final solution — revisit once Mitosis adds native support or we switch strategy (e.g. generating Astro from the HTML output with bindings via `define:vars`).

## Quality-gate validation (v1)
Mechanically checkable rules from `component-quality-spec.md`, enforced in `validate.ts` before compilation runs — a violation aborts the whole pipeline, same as a structurally invalid AST:
- Rule 1 (semantic HTML5): any node with an event attribute (`{ on: ... }`) must use a native interactive tag (`button`/`a`/`input`/`select`/`textarea`) or declare an explicit `role` attribute.
- Rule 2 (WCAG 2.1 AA): every interactive element needs an accessible name (literal text child, or `aria-label`/`aria-labelledby` attribute); every `img` needs `alt`; no positive `tabindex`.
- What's **not** checked here (documented gap, not silently skipped): `aria-live` on dynamic content, `prefers-reduced-motion` on animation, focus management around `show`/`for` — these need runtime inspection, not static AST analysis, and are tracked in `component-qa-strategy-spec.md` instead.

## Errors
- Invalid AST (missing required field, or a quality-gate violation above) → aborts with a message pointing at the field/rule.
- A generation failure for one target doesn't abort the others — each output runs isolated, errors are reported per target.

## Verification
- `tsc --noEmit` on generated `.tsx` files (react) — no syntax errors.
- Visual review of generated `.lite.tsx`/`.vue`/`.astro` (prototype stage, no automated test yet).
