# Spec — Mitosis Compiler (`mitosis-compiler-spec`)

## Context
Prototype pipeline (equivalent to CP-001 + CP-002 in `Worklist.md`, without depending on Postgres): converts a component AST (`ast-component-spec.md`) into code for multiple frameworks, via Mitosis (`@builder.io/mitosis`, pinned version `0.14.0`).

## Input
A `*.ast.json` file following `ast-component-spec.md`.

## Steps

1. **Parse + minimal validation** of the AST JSON (checks `name`, `props[]`, `root` are present; explicit error if missing).
2. **`astToMitosisComponent(ast)`** — recursively transforms `root` into Mitosis nodes via `createMitosisNode` (API from `@builder.io/mitosis`):
   - Element node → `{ name: tag, properties: {<static attrs>}, bindings: {<attrs with bind>}, children: [...] }`.
   - Literal text node → `{ name: 'div', properties: { _text: <string> }, bindings: {}, children: [] }`.
   - Dynamic text node (`bind`) → `{ name: 'div', properties: {}, bindings: { _text: { code, bindingType: 'expression', type: 'single' } }, children: [] }`.
   - Builds the root component: `{ '@type': '@builder.io/mitosis/component', name, inputs: [], children: [mapped root] }` (AST props become the component's typed inputs).
3. **`.lite.tsx` output**: `componentToMitosis()({ component })` → written to `compiler/out/<name>/<name>.lite.tsx`.
4. **React output**: `componentToReact()({ component })` → `compiler/out/<name>/react/<name>.tsx`.
5. **Vue output**: `componentToVue()({ component })` → `compiler/out/<name>/vue/<name>.vue`.
6. **Astro output**: **no native generator** in Mitosis 0.14.0 (`targets` doesn't include `astro` — confirmed by inspecting the package). Workaround: `componentToHtml()({ component })` manually wrapped in an Astro component shell (empty `---\n---` frontmatter + the generated HTML as template) → `compiler/out/<name>/astro/<name>.astro`. Documented as a known limitation, not a final solution — revisit once Mitosis adds native support or we switch strategy (e.g. generating Astro from the HTML output with bindings via `define:vars`).

## Errors
- Invalid AST (missing required field) → aborts with a message pointing at the field.
- A generation failure for one target doesn't abort the others — each output runs isolated, errors are reported per target.

## Verification
- `tsc --noEmit` on generated `.tsx` files (react) — no syntax errors.
- Visual review of generated `.lite.tsx`/`.vue`/`.astro` (prototype stage, no automated test yet).
